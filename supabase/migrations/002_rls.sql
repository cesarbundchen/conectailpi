-- =================================================================
-- ConectaILPI SaaS — Row Level Security (multi-tenant)
-- Executar APÓS o 001_schema.sql
-- Cada usuário só enxerga dados da própria ILPI, garantido pelo banco
-- =================================================================

-- Helpers
CREATE OR REPLACE FUNCTION minha_ilpi_id() RETURNS UUID AS $$
  SELECT ilpi_id FROM perfis WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION meu_papel() RETURNS TEXT AS $$
  SELECT papel FROM perfis WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Ativar RLS em todas as tabelas
ALTER TABLE ilpis          ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE residentes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE administracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis   ENABLE ROW LEVEL SECURITY;
ALTER TABLE saidas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico      ENABLE ROW LEVEL SECURITY;

-- ILPIs: usuário vê apenas a própria
CREATE POLICY ilpi_select ON ilpis FOR SELECT USING (id = minha_ilpi_id());
CREATE POLICY ilpi_update ON ilpis FOR UPDATE USING (id = minha_ilpi_id() AND meu_papel() = 'admin');

-- Perfis: ver colegas da mesma ILPI; editar apenas admin
CREATE POLICY perfil_select ON perfis FOR SELECT USING (ilpi_id = minha_ilpi_id());
CREATE POLICY perfil_admin  ON perfis FOR ALL    USING (ilpi_id = minha_ilpi_id() AND meu_papel() = 'admin');

-- Residentes
CREATE POLICY res_select ON residentes FOR SELECT USING (ilpi_id = minha_ilpi_id());
CREATE POLICY res_insert ON residentes FOR INSERT WITH CHECK (ilpi_id = minha_ilpi_id());
CREATE POLICY res_update ON residentes FOR UPDATE USING (ilpi_id = minha_ilpi_id());

-- Medicamentos
CREATE POLICY med_all ON medicamentos FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Administrações
CREATE POLICY adm_all ON administracoes FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Ocorrências
CREATE POLICY oc_all ON ocorrencias FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Atendimentos
CREATE POLICY at_all ON atendimentos FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Restrições
CREATE POLICY rest_all ON restricoes FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Financeiro: SELECT para todos da ILPI; escrita apenas admin/coordenador
CREATE POLICY fin_select ON financeiro FOR SELECT USING (ilpi_id = minha_ilpi_id());
CREATE POLICY fin_write  ON financeiro FOR INSERT
  WITH CHECK (ilpi_id = minha_ilpi_id() AND meu_papel() IN ('admin','coordenador'));
CREATE POLICY fin_update ON financeiro FOR UPDATE
  USING (ilpi_id = minha_ilpi_id() AND meu_papel() IN ('admin','coordenador'));

-- Documentos
CREATE POLICY doc_all ON documentos FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Responsáveis
CREATE POLICY resp_all ON responsaveis FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Saídas
CREATE POLICY sai_all ON saidas FOR ALL
  USING (ilpi_id = minha_ilpi_id()) WITH CHECK (ilpi_id = minha_ilpi_id());

-- Histórico: leitura pela ILPI, escrita pela ILPI, NUNCA update/delete
CREATE POLICY hist_select ON historico FOR SELECT USING (ilpi_id = minha_ilpi_id());
CREATE POLICY hist_insert ON historico FOR INSERT WITH CHECK (ilpi_id = minha_ilpi_id());
-- (sem políticas de UPDATE/DELETE = ninguém consegue alterar o histórico)

-- NOTA: o portal da família NÃO usa estas políticas.
-- Ele roda no servidor com a service_role key (que ignora RLS),
-- filtrando apenas pelo portal_token único da residente.
