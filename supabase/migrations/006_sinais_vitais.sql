-- ═══════════════════════════════════════════════════════════════════
-- 006 — SINAIS VITAIS SOB DEMANDA
-- Suporta o Registro de Cuidados: aferição de pressão arterial feita
-- "quando necessário" pela cuidadora, fora da rotina de prescrição.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE sinais_vitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilpi_id UUID NOT NULL REFERENCES ilpis(id),
  residente_id UUID NOT NULL REFERENCES residentes(id),
  sistolica INTEGER NOT NULL CHECK (sistolica BETWEEN 40 AND 300),
  diastolica INTEGER NOT NULL CHECK (diastolica BETWEEN 20 AND 200),
  pulso INTEGER CHECK (pulso IS NULL OR pulso BETWEEN 20 AND 250),
  observacao TEXT,
  alerta BOOLEAN NOT NULL DEFAULT false,
  registrado_por UUID,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN sinais_vitais.alerta IS
  'true quando a leitura está fora da faixa segura (calculado no servidor) — dispara item de prioridade Alta no plantão.';

CREATE INDEX idx_sinais_vitais_residente ON sinais_vitais(residente_id, criado_em DESC);

ALTER TABLE sinais_vitais ENABLE ROW LEVEL SECURITY;

CREATE POLICY sinais_vitais_all ON sinais_vitais FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());
