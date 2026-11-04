-- =================================================================
-- ConectaILPI SaaS — Sprint 4: campos do modo SaaS
-- Executar APÓS 001 e 002
-- =================================================================

-- Campos de cobrança (Stripe preparado, desativado)
ALTER TABLE ilpis ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE ilpis ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE ilpis ADD COLUMN IF NOT EXISTS plano_expira_em DATE;

-- Índice para o painel do operador
CREATE INDEX IF NOT EXISTS idx_ilpis_ativo ON ilpis(ativo);

-- NOTA: o painel /admin do operador NÃO usa RLS — ele roda no servidor
-- com a service_role key, restrito aos e-mails em SUPER_ADMIN_EMAILS.
