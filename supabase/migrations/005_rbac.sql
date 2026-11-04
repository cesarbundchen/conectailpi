-- ═══════════════════════════════════════════════════════════════════
-- 005 — CONTROLE DE ACESSO EM TRÊS NÍVEIS
--
--  Nível 1 — PLATAFORMA (Conecta ILPI)   → tabela plataforma_usuarios
--  Nível 2 — EMPRESA (cada ILPI)         → operador de dados + perfis próprios
--  Nível 3 — USUÁRIOS da empresa         → perfil_acesso_id configurável
--
-- Substitui o campo perfis.papel (4 valores fixos) por perfis de acesso
-- que cada instituição define e configura por módulo.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- NÍVEL 1 — Equipe da plataforma (Conecta ILPI)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE plataforma_usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  nivel TEXT NOT NULL CHECK (nivel IN ('master', 'operacao', 'suporte')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE plataforma_usuarios IS
  'Equipe da Conecta ILPI. master = sócios (tudo, incluindo criar instituições e alterar planos); '
  'operacao = provisiona contas e dá suporte com acesso a dados; '
  'suporte = apenas leitura de metadados, NUNCA acessa dado clínico de residente.';

-- ─────────────────────────────────────────────────────────────────
-- NÍVEL 2 — Perfis de acesso definidos POR CADA EMPRESA
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE perfis_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  formacoes TEXT,                                  -- ex.: 'Enfermeiro(a) (COREN)'
  vinculo TEXT NOT NULL DEFAULT 'proprio'
    CHECK (vinculo IN ('proprio', 'voluntario', 'terceirizado', 'autonomo')),
  permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["financeiro:ver","nutricao:incluir",...]
  protegido BOOLEAN NOT NULL DEFAULT false,        -- perfil do operador: não pode ser editado/excluído
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ilpi_id, nome)
);

CREATE INDEX idx_perfis_acesso_ilpi ON perfis_acesso(ilpi_id) WHERE ativo = true;

COMMENT ON COLUMN perfis_acesso.permissoes IS
  'Array JSON de "modulo:acao" derivado de src/lib/modulos.ts. '
  'Ex.: ["residentes:ver","medicamentos:incluir"]. Fonte única no código.';

-- ─────────────────────────────────────────────────────────────────
-- NÍVEL 3 — Usuários da empresa passam a apontar para um perfil
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE perfis
  ADD COLUMN perfil_acesso_id UUID REFERENCES perfis_acesso(id) ON DELETE RESTRICT,
  ADD COLUMN operador_dados   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cpf              TEXT,
  ADD COLUMN registro_conselho TEXT,               -- CRM, COREN, CRN, CRP, CREFITO...
  ADD COLUMN instituicao_origem TEXT,              -- voluntário/terceirizado: de onde vem
  ADD COLUMN vinculo_expira_em DATE;               -- acesso temporário: expira sozinho

COMMENT ON COLUMN perfis.operador_dados IS
  'Responsável legal pelo tratamento de dados da instituição (LGPD art. 5, VII). '
  'Um por ILPI. Único que aprova solicitações e exclusões.';
COMMENT ON COLUMN perfis.vinculo_expira_em IS
  'Voluntários e terceirizados perdem acesso automaticamente nesta data.';

-- Índice para a checagem de expiração no login
CREATE INDEX idx_perfis_expira ON perfis(vinculo_expira_em) WHERE vinculo_expira_em IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- Fila de solicitações (regra: só inclui; alterar/excluir pede aprovação)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id) ON DELETE CASCADE,
  solicitante_id UUID NOT NULL REFERENCES perfis(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('alteracao', 'arquivamento', 'exportacao')),
  modulo TEXT NOT NULL,                            -- id do módulo em modulos.ts
  registro_id UUID,                                -- objeto alvo (pode ser nulo p/ exportação)
  registro_descricao TEXT NOT NULL,                -- texto legível: "Losartana 50mg - D. Maria"
  motivo TEXT NOT NULL,
  valor_atual TEXT,
  valor_proposto TEXT,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'recusada', 'cancelada')),
  aprovador_id UUID REFERENCES perfis(id),
  resposta TEXT,
  respondido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_fila ON solicitacoes(ilpi_id, status) WHERE status = 'pendente';

-- ─────────────────────────────────────────────────────────────────
-- Duplo check: ações irreversíveis ficam pendentes por 7 dias
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE acoes_criticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN
    ('arquivar_residente', 'registrar_obito', 'exportar_instituicao',
     'desativar_operador', 'alterar_cadastro_empresa')),
  registro_id UUID,
  registro_descricao TEXT NOT NULL,
  iniciada_por UUID NOT NULL REFERENCES perfis(id),
  confirmada_por UUID REFERENCES perfis(id),       -- 2o usuário: nunca igual ao 1o
  texto_confirmacao TEXT,                          -- o que a pessoa digitou
  status TEXT NOT NULL DEFAULT 'aguardando_aprovacao'
    CHECK (status IN ('aguardando_aprovacao', 'em_janela_reversao', 'efetivada', 'revertida', 'recusada')),
  efetiva_em TIMESTAMPTZ,                          -- criado_em + 7 dias
  revertida_por UUID REFERENCES perfis(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- REGRA DE OURO: quem inicia não pode confirmar
  CONSTRAINT dois_usuarios_distintos CHECK (confirmada_por IS NULL OR confirmada_por <> iniciada_por)
);

CREATE INDEX idx_acoes_criticas_pend ON acoes_criticas(ilpi_id, status)
  WHERE status IN ('aguardando_aprovacao', 'em_janela_reversao');

-- ═══════════════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES (SECURITY DEFINER — usadas pelas policies)
-- ═══════════════════════════════════════════════════════════════════

-- Usuário é da equipe da plataforma?
CREATE OR REPLACE FUNCTION sou_plataforma() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM plataforma_usuarios WHERE id = auth.uid() AND ativo = true);
$$;

-- Nível na plataforma (master/operacao/suporte) ou NULL
CREATE OR REPLACE FUNCTION meu_nivel_plataforma() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT nivel FROM plataforma_usuarios WHERE id = auth.uid() AND ativo = true;
$$;

-- Sou o operador de dados da minha instituição?
CREATE OR REPLACE FUNCTION sou_operador_dados() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE((SELECT operador_dados FROM perfis WHERE id = auth.uid() AND ativo = true), false);
$$;

-- Tenho a permissão "modulo:acao"? Considera vínculo expirado.
CREATE OR REPLACE FUNCTION tenho_permissao(p_permissao TEXT) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM perfis p
    JOIN perfis_acesso pa ON pa.id = p.perfil_acesso_id
    WHERE p.id = auth.uid()
      AND p.ativo = true
      AND pa.ativo = true
      AND (p.vinculo_expira_em IS NULL OR p.vinculo_expira_em >= CURRENT_DATE)
      AND pa.permissoes ? p_permissao
  );
$$;

COMMENT ON FUNCTION tenho_permissao IS
  'Checagem central de permissão. Vínculo vencido = acesso negado automaticamente.';

-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE plataforma_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_acesso       ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoes_criticas      ENABLE ROW LEVEL SECURITY;

-- plataforma_usuarios: só a própria equipe enxerga; só master escreve
CREATE POLICY plataforma_ver ON plataforma_usuarios
  FOR SELECT USING (sou_plataforma());
CREATE POLICY plataforma_escrever ON plataforma_usuarios
  FOR ALL USING (meu_nivel_plataforma() = 'master')
  WITH CHECK (meu_nivel_plataforma() = 'master');

-- perfis_acesso: cada empresa vê só os seus; edita quem tem usuarios:editar
CREATE POLICY perfis_acesso_ver ON perfis_acesso
  FOR SELECT USING (ilpi_id = minha_ilpi_id() OR sou_plataforma());
CREATE POLICY perfis_acesso_incluir ON perfis_acesso
  FOR INSERT WITH CHECK (ilpi_id = minha_ilpi_id() AND tenho_permissao('usuarios:incluir'));
CREATE POLICY perfis_acesso_editar ON perfis_acesso
  FOR UPDATE USING (ilpi_id = minha_ilpi_id() AND tenho_permissao('usuarios:editar') AND protegido = false);

-- solicitacoes: vejo as minhas; operador vê todas da instituição
CREATE POLICY solicitacoes_ver ON solicitacoes
  FOR SELECT USING (
    ilpi_id = minha_ilpi_id()
    AND (solicitante_id = auth.uid() OR sou_operador_dados() OR tenho_permissao('solicitacoes:editar'))
  );
CREATE POLICY solicitacoes_incluir ON solicitacoes
  FOR INSERT WITH CHECK (ilpi_id = minha_ilpi_id() AND solicitante_id = auth.uid());
-- Só o operador responde (aprova/recusa)
CREATE POLICY solicitacoes_responder ON solicitacoes
  FOR UPDATE USING (ilpi_id = minha_ilpi_id() AND sou_operador_dados());

-- acoes_criticas: quem tem o módulo vê; só operador confirma
CREATE POLICY acoes_ver ON acoes_criticas
  FOR SELECT USING (ilpi_id = minha_ilpi_id());
CREATE POLICY acoes_iniciar ON acoes_criticas
  FOR INSERT WITH CHECK (ilpi_id = minha_ilpi_id() AND iniciada_por = auth.uid());
CREATE POLICY acoes_confirmar ON acoes_criticas
  FOR UPDATE USING (ilpi_id = minha_ilpi_id() AND sou_operador_dados());

-- Ninguém apaga solicitação nem ação crítica: são trilha de auditoria
-- (a ausência de policy FOR DELETE já bloqueia; explicitado por clareza)

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS de atualizado_em
-- ═══════════════════════════════════════════════════════════════════
CREATE TRIGGER tg_perfis_acesso_upd BEFORE UPDATE ON perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();
CREATE TRIGGER tg_solicitacoes_upd BEFORE UPDATE ON solicitacoes
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();
CREATE TRIGGER tg_acoes_criticas_upd BEFORE UPDATE ON acoes_criticas
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();
CREATE TRIGGER tg_plataforma_upd BEFORE UPDATE ON plataforma_usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();

-- ═══════════════════════════════════════════════════════════════════
-- MIGRAÇÃO DOS DADOS EXISTENTES
-- Converte os 4 papéis antigos em perfis de acesso equivalentes,
-- para que nenhuma instituição já cadastrada perca acesso.
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_ilpi RECORD;
  v_admin UUID; v_coord UUID; v_tec UUID; v_cuid UUID;
BEGIN
  FOR v_ilpi IN SELECT id FROM ilpis LOOP
    INSERT INTO perfis_acesso (ilpi_id, nome, descricao, formacoes, permissoes, protegido)
    VALUES (v_ilpi.id, 'Administrador da instituição',
            'Perfil criado na migração a partir do papel "admin"', 'Direção, gestão',
            (SELECT jsonb_agg(p) FROM (VALUES
              ('residentes:ver'),('residentes:incluir'),('residentes:editar'),('residentes:arquivar'),
              ('medicamentos:ver'),('medicamentos:incluir'),('medicamentos:editar'),('medicamentos:arquivar'),
              ('ocorrencias:ver'),('ocorrencias:incluir'),('ocorrencias:editar'),
              ('atendimentos:ver'),('atendimentos:incluir'),('atendimentos:editar'),
              ('restricoes:ver'),('restricoes:incluir'),('restricoes:editar'),('restricoes:arquivar'),
              ('avaliacoes:ver'),('avaliacoes:incluir'),
              ('leitos:ver'),('leitos:incluir'),('leitos:editar'),
              ('plantao:ver'),('plantao:incluir'),('plantao:editar'),
              ('cuidados:ver'),('cuidados:incluir'),
              ('nutricao:ver'),('nutricao:incluir'),('nutricao:editar'),
              ('financeiro:ver'),('financeiro:incluir'),('financeiro:editar'),
              ('documentos:ver'),('documentos:incluir'),('documentos:editar'),('documentos:arquivar'),
              ('responsaveis:ver'),('responsaveis:incluir'),('responsaveis:editar'),
              ('relatorios:ver'),('dados:ver'),('dados:incluir'),('historico:ver'),
              ('usuarios:ver'),('usuarios:incluir'),('usuarios:editar'),('usuarios:arquivar'),
              ('configuracoes:ver'),('configuracoes:editar'),
              ('solicitacoes:ver'),('solicitacoes:incluir'),('solicitacoes:editar')
            ) AS t(p)), true)
    RETURNING id INTO v_admin;

    INSERT INTO perfis_acesso (ilpi_id, nome, descricao, formacoes, permissoes)
    VALUES (v_ilpi.id, 'Coordenação', 'Migrado do papel "coordenador"', 'Coordenação clínica',
            (SELECT jsonb_agg(p) FROM (VALUES
              ('residentes:ver'),('residentes:incluir'),('residentes:editar'),
              ('medicamentos:ver'),('medicamentos:incluir'),('medicamentos:editar'),
              ('ocorrencias:ver'),('ocorrencias:incluir'),('ocorrencias:editar'),
              ('atendimentos:ver'),('atendimentos:incluir'),('atendimentos:editar'),
              ('restricoes:ver'),('restricoes:incluir'),('restricoes:editar'),
              ('avaliacoes:ver'),('avaliacoes:incluir'),
              ('leitos:ver'),('leitos:incluir'),('leitos:editar'),
              ('plantao:ver'),('plantao:incluir'),('plantao:editar'),
              ('cuidados:ver'),('cuidados:incluir'),
              ('nutricao:ver'),('nutricao:incluir'),('nutricao:editar'),
              ('financeiro:ver'),('financeiro:incluir'),('financeiro:editar'),
              ('documentos:ver'),('documentos:incluir'),('documentos:editar'),
              ('responsaveis:ver'),('responsaveis:incluir'),('responsaveis:editar'),
              ('relatorios:ver'),('dados:ver'),('dados:incluir'),('historico:ver'),
              ('usuarios:ver'),('solicitacoes:ver'),('solicitacoes:incluir')
            ) AS t(p)))
    RETURNING id INTO v_coord;

    INSERT INTO perfis_acesso (ilpi_id, nome, descricao, formacoes, permissoes)
    VALUES (v_ilpi.id, 'Técnico(a) de enfermagem', 'Migrado do papel "tecnico"', 'Técnico(a) de enfermagem (COREN)',
            (SELECT jsonb_agg(p) FROM (VALUES
              ('residentes:ver'),('medicamentos:ver'),('medicamentos:incluir'),
              ('ocorrencias:ver'),('ocorrencias:incluir'),('restricoes:ver'),
              ('avaliacoes:ver'),('avaliacoes:incluir'),
              ('plantao:ver'),('plantao:incluir'),('plantao:editar'),
              ('cuidados:ver'),('cuidados:incluir'),('nutricao:ver'),('leitos:ver'),
              ('solicitacoes:ver'),('solicitacoes:incluir')
            ) AS t(p)))
    RETURNING id INTO v_tec;

    INSERT INTO perfis_acesso (ilpi_id, nome, descricao, formacoes, permissoes)
    VALUES (v_ilpi.id, 'Cuidador(a)', 'Migrado do papel "cuidador"', 'Cuidador(a) de idosos',
            (SELECT jsonb_agg(p) FROM (VALUES
              ('residentes:ver'),('medicamentos:ver'),('medicamentos:incluir'),
              ('ocorrencias:ver'),('ocorrencias:incluir'),('restricoes:ver'),
              ('plantao:ver'),('plantao:incluir'),('plantao:editar'),
              ('cuidados:ver'),('cuidados:incluir'),('nutricao:ver'),('leitos:ver'),
              ('solicitacoes:ver'),('solicitacoes:incluir')
            ) AS t(p)))
    RETURNING id INTO v_cuid;

    UPDATE perfis SET perfil_acesso_id = CASE papel
      WHEN 'admin' THEN v_admin WHEN 'coordenador' THEN v_coord
      WHEN 'tecnico' THEN v_tec ELSE v_cuid END
    WHERE ilpi_id = v_ilpi.id AND perfil_acesso_id IS NULL;

    -- O primeiro admin da instituição vira o operador de dados
    UPDATE perfis SET operador_dados = true
    WHERE id = (SELECT id FROM perfis WHERE ilpi_id = v_ilpi.id AND papel = 'admin'
                ORDER BY criado_em LIMIT 1);
  END LOOP;
END $$;

-- papel fica como legado (não removemos ainda: rollback seguro durante o piloto)
COMMENT ON COLUMN perfis.papel IS
  'LEGADO — substituído por perfil_acesso_id na migração 005. Mantido para rollback. Remover após o piloto.';
