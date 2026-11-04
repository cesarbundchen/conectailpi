-- =================================================================
-- ConectaILPI SaaS — Schema completo (13 tabelas)
-- Executar no SQL Editor do Supabase ANTES do 002_rls.sql
-- =================================================================

-- 1. ILPIs (tenants)
CREATE TABLE ilpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  capacidade INT DEFAULT 20,
  plano TEXT DEFAULT 'gratuito',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Perfis (usuários vinculados ao auth.users)
CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  nome TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'cuidador' CHECK (papel IN ('admin','coordenador','tecnico','cuidador')),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Residentes
CREATE TABLE residentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  nome TEXT NOT NULL,
  nome_social TEXT,
  data_nascimento DATE,
  cpf TEXT, rg TEXT,
  naturalidade TEXT, estado_civil TEXT, religiao TEXT,
  escolaridade TEXT, profissao TEXT,
  quarto TEXT, leito TEXT,
  data_admissao DATE,
  grau_dependencia TEXT,
  status TEXT NOT NULL DEFAULT 'Triagem' CHECK (status IN ('Triagem','Ativa','Ausente','Inativa','Falecida')),
  observacoes TEXT,
  portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_residentes_ilpi ON residentes(ilpi_id);
CREATE INDEX idx_residentes_status ON residentes(ilpi_id, status);

-- 4. Medicamentos
CREATE TABLE medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  nome_medicamento TEXT NOT NULL,
  dosagem TEXT, via TEXT, frequencia TEXT,
  horarios TEXT[],
  data_inicio DATE, data_fim DATE,
  medico_nome TEXT, medico_crm TEXT,
  controlado BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo','Suspenso','Arquivado')),
  arquivado BOOLEAN DEFAULT FALSE,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_med_ilpi ON medicamentos(ilpi_id, status);
CREATE INDEX idx_med_res ON medicamentos(residente_id);

-- 5. Administrações de medicamentos
CREATE TABLE administracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  medicamento_id UUID NOT NULL REFERENCES medicamentos(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  horario TEXT NOT NULL,
  status TEXT DEFAULT 'Administrado' CHECK (status IN ('Administrado','Recusado','Não encontrado','Adiado')),
  observacoes TEXT,
  administrado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_adm_med ON administracoes(medicamento_id);

-- 6. Ocorrências
CREATE TABLE ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  tipo_ocorrencia TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  local TEXT,
  descricao TEXT NOT NULL,
  acao_imediata TEXT,
  desfecho TEXT,
  status TEXT DEFAULT 'Aberta' CHECK (status IN ('Aberta','Monitorando','Resolvida')),
  familiar_notificado BOOLEAN DEFAULT FALSE,
  visivel_portal BOOLEAN DEFAULT TRUE,
  registrado_por UUID,
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID,
  arquivado BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_oc_ilpi ON ocorrencias(ilpi_id, status);

-- 7. Atendimentos
CREATE TABLE atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_atendimento TEXT NOT NULL,
  medico_nome TEXT, medico_crm TEXT,
  queixas TEXT, diagnostico TEXT, cid10 TEXT, conduta TEXT,
  retorno DATE,
  arquivado BOOLEAN DEFAULT FALSE,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_at_ilpi ON atendimentos(ilpi_id);

-- 8. Restrições
CREATE TABLE restricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  gravidade TEXT DEFAULT 'Alta' CHECK (gravidade IN ('Alta','Média','Baixa')),
  status TEXT DEFAULT 'Ativa' CHECK (status IN ('Ativa','Inativa')),
  arquivado BOOLEAN DEFAULT FALSE,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rest_res ON restricoes(residente_id, status);

-- 9. Financeiro
CREATE TABLE financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INT NOT NULL,
  mensalidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  extras NUMERIC(10,2) DEFAULT 0,
  descricao_extras TEXT,
  valor_pago NUMERIC(10,2) DEFAULT 0,
  data_pagamento DATE,
  forma_pagamento TEXT,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente','Pago','Parcial','Atrasado')),
  arquivado BOOLEAN DEFAULT FALSE,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (residente_id, mes, ano)
);
CREATE INDEX idx_fin_ilpi ON financeiro(ilpi_id, ano, mes);

-- 10. Documentos
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  drive_url TEXT,
  data_documento DATE,
  status TEXT DEFAULT 'Ok',
  visivel_portal BOOLEAN DEFAULT FALSE,
  arquivado BOOLEAN DEFAULT FALSE,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Responsáveis
CREATE TABLE responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  nome TEXT NOT NULL,
  cpf TEXT, parentesco TEXT,
  tipo TEXT DEFAULT 'Familiar' CHECK (tipo IN ('Financeiro','Familiar','Ambos')),
  telefone_principal TEXT, email TEXT,
  autorizado_retirada BOOLEAN DEFAULT FALSE,
  acesso_portal BOOLEAN DEFAULT TRUE,
  arquivado BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Saídas
CREATE TABLE saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  tipo_saida TEXT NOT NULL CHECK (tipo_saida IN ('Alta','Transferência','Obito')),
  data_saida DATE NOT NULL,
  motivo TEXT,
  medico_atestante TEXT,
  causa_obito TEXT,
  observacoes TEXT,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Histórico (auditoria imutável)
CREATE TABLE historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID REFERENCES residentes(id),
  usuario_id UUID,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hist_ilpi ON historico(ilpi_id, criado_em DESC);

-- Trigger: atualizado_em automático em residentes
CREATE OR REPLACE FUNCTION fn_atualizado_em() RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_res_atualizado BEFORE UPDATE ON residentes
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();
