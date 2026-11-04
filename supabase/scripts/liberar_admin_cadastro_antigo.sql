-- ConectaILPI: libera o acesso do administrador criado pelo /cadastro
-- Troque o e-mail na linha abaixo e clique em Run.
DO $$
DECLARE
  v_email TEXT := 'SEU-EMAIL@exemplo.com';
  v_user  UUID;
  v_ilpi  UUID;
  v_perfil UUID;
BEGIN
  SELECT p.id, p.ilpi_id INTO v_user, v_ilpi
  FROM perfis p JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(v_email);

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'E-mail % não encontrado. Faça primeiro o cadastro em /cadastro.', v_email;
  END IF;

  INSERT INTO perfis_acesso (ilpi_id, nome, descricao, formacoes, permissoes, protegido)
  VALUES (v_ilpi, 'Administrador da instituição',
          'Perfil completo do administrador da instituição', 'Direção, gestão',
          to_jsonb(ARRAY['residentes:ver', 'residentes:incluir', 'residentes:editar', 'residentes:arquivar', 'medicamentos:ver', 'medicamentos:incluir', 'medicamentos:editar', 'medicamentos:arquivar', 'ocorrencias:ver', 'ocorrencias:incluir', 'ocorrencias:editar', 'atendimentos:ver', 'atendimentos:incluir', 'atendimentos:editar', 'restricoes:ver', 'restricoes:incluir', 'restricoes:editar', 'restricoes:arquivar', 'avaliacoes:ver', 'avaliacoes:incluir', 'registro:ver', 'registro:incluir', 'leitos:ver', 'leitos:incluir', 'leitos:editar', 'plantao:ver', 'plantao:incluir', 'plantao:editar', 'cuidados:ver', 'cuidados:incluir', 'nutricao:ver', 'nutricao:incluir', 'nutricao:editar', 'financeiro:ver', 'financeiro:incluir', 'financeiro:editar', 'documentos:ver', 'documentos:incluir', 'documentos:editar', 'documentos:arquivar', 'responsaveis:ver', 'responsaveis:incluir', 'responsaveis:editar', 'relatorios:ver', 'dados:ver', 'dados:incluir', 'historico:ver', 'usuarios:ver', 'usuarios:incluir', 'usuarios:editar', 'usuarios:arquivar', 'configuracoes:ver', 'configuracoes:editar', 'solicitacoes:ver', 'solicitacoes:incluir', 'solicitacoes:editar']::text[]), true)
  ON CONFLICT (ilpi_id, nome) DO UPDATE SET permissoes = EXCLUDED.permissoes, ativo = true
  RETURNING id INTO v_perfil;

  UPDATE perfis SET perfil_acesso_id = v_perfil, operador_dados = true, ativo = true
  WHERE id = v_user;

  RAISE NOTICE 'Pronto: % agora é Administrador da instituição e Operador de Dados.', v_email;
END $$;
