-- =================================================================
-- ConectaILPI — Sprint 6: Hotelaria e Cuidado Diário
-- (benchmarking: fecha gaps vs. Sistema Cuidare e SILPI)
-- Executar APÓS 001, 002 e 003
-- =================================================================

-- Itens do quadro de plantão (kanban de pendências entre turnos)
CREATE TABLE plantao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID REFERENCES residentes(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT DEFAULT 'Normal' CHECK (prioridade IN ('Alta','Normal')),
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente','Em observação','Concluída')),
  criado_por UUID,
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID,
  arquivado BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_plantao_ilpi ON plantao_itens(ilpi_id, status);

-- Fechamento/passagem de plantão (registro formal do turno)
CREATE TABLE plantoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL CHECK (turno IN ('Diurno','Noturno')),
  resumo TEXT NOT NULL,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Hidratação diária (meta na residente + registros)
ALTER TABLE residentes ADD COLUMN IF NOT EXISTS meta_hidratacao_ml INT DEFAULT 1500;
CREATE TABLE hidratacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  volume_ml INT NOT NULL CHECK (volume_ml > 0 AND volume_ml <= 2000),
  tipo TEXT DEFAULT 'Água',
  registrado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hidr ON hidratacao(ilpi_id, data, residente_id);

-- Dieta individualizada (uma ativa por residente)
CREATE TABLE dietas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  tipo_dieta TEXT NOT NULL CHECK (tipo_dieta IN ('Geral','Branda','Pastosa','Líquida','Enteral')),
  restricoes TEXT,
  suplementos TEXT,
  observacoes TEXT,
  prescrito_por TEXT,
  status TEXT DEFAULT 'Ativa' CHECK (status IN ('Ativa','Inativa')),
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_dietas ON dietas(ilpi_id, status);

-- Rondas (noturnas ou diurnas), registro por residente
CREATE TABLE rondas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  situacao TEXT NOT NULL CHECK (situacao IN ('Dormindo','Acordada tranquila','Agitada','Necessitou atendimento')),
  observacao TEXT,
  registrado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rondas ON rondas(ilpi_id, data_hora DESC);

-- Escalas de avaliação (Katz, Braden, Morse) com pontuação
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  escala TEXT NOT NULL CHECK (escala IN ('Katz','Braden','Morse')),
  respostas JSONB NOT NULL,
  pontuacao INT NOT NULL,
  classificacao TEXT NOT NULL,
  aplicado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_aval ON avaliacoes(residente_id, escala, criado_em DESC);

-- RLS nas novas tabelas (mesmo padrão multi-tenant)
ALTER TABLE plantao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidratacao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes    ENABLE ROW LEVEL SECURITY;

CREATE POLICY pi_all  ON plantao_itens FOR ALL USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
CREATE POLICY pl_all  ON plantoes      FOR ALL USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
CREATE POLICY hi_all  ON hidratacao    FOR ALL USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
CREATE POLICY di_all  ON dietas        FOR ALL USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
CREATE POLICY ro_all  ON rondas        FOR ALL USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
CREATE POLICY av_all  ON avaliacoes    FOR ALL USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
