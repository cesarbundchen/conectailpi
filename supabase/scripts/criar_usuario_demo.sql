-- ConectaILPI: cria a ILPI de demonstração e transforma um usuário em administrador.
-- ANTES: crie o usuário em Authentication > Users > Add user > Create new user
--        (marque "Auto Confirm User").
-- DEPOIS: troque as 3 linhas abaixo e clique em Run.
DO $$
DECLARE
  v_email     TEXT := 'SEU-EMAIL@exemplo.com';   -- o mesmo e-mail criado em Authentication > Users
  v_nome      TEXT := 'Seu Nome';
  v_ilpi_nome TEXT := 'ILPI Demonstração';
  v_user   UUID;
  v_ilpi   UUID;
  v_perfil UUID;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'E-mail % não existe em Authentication > Users. Crie o usuário lá primeiro.', v_email;
  END IF;

  -- Reaproveita a ILPI se o usuário já tiver uma; senão, cria
  SELECT ilpi_id INTO v_ilpi FROM perfis WHERE id = v_user;
  IF v_ilpi IS NULL THEN
    INSERT INTO ilpis (nome, email, plano) VALUES (v_ilpi_nome, v_email, 'gratuito')
    RETURNING id INTO v_ilpi;
    INSERT INTO perfis (id, ilpi_id, nome, papel) VALUES (v_user, v_ilpi, v_nome, 'admin');
  END IF;

  INSERT INTO perfis_acesso (ilpi_id, nome, descricao, formacoes, permissoes, protegido)
  VALUES (v_ilpi, 'Administrador da instituição',
          'Perfil completo do administrador da instituição', 'Direção, gestão',
          to_jsonb(ARRAY['residentes:ver', 'residentes:incluir', 'residentes:editar', 'residentes:arquivar', 'medicamentos:ver', 'medicamentos:incluir', 'medicamentos:editar', 'medicamentos:arquivar', 'ocorrencias:ver', 'ocorrencias:incluir', 'ocorrencias:editar', 'atendimentos:ver', 'atendimentos:incluir', 'atendimentos:editar', 'restricoes:ver', 'restricoes:incluir', 'restricoes:editar', 'restricoes:arquivar', 'avaliacoes:ver', 'avaliacoes:incluir', 'registro:ver', 'registro:incluir', 'leitos:ver', 'leitos:incluir', 'leitos:editar', 'plantao:ver', 'plantao:incluir', 'plantao:editar', 'cuidados:ver', 'cuidados:incluir', 'nutricao:ver', 'nutricao:incluir', 'nutricao:editar', 'financeiro:ver', 'financeiro:incluir', 'financeiro:editar', 'documentos:ver', 'documentos:incluir', 'documentos:editar', 'documentos:arquivar', 'responsaveis:ver', 'responsaveis:incluir', 'responsaveis:editar', 'relatorios:ver', 'dados:ver', 'dados:incluir', 'historico:ver', 'usuarios:ver', 'usuarios:incluir', 'usuarios:editar', 'usuarios:arquivar', 'configuracoes:ver', 'configuracoes:editar', 'solicitacoes:ver', 'solicitacoes:incluir', 'solicitacoes:editar']::text[]), true)
  ON CONFLICT (ilpi_id, nome) DO UPDATE SET permissoes = EXCLUDED.permissoes, ativo = true
  RETURNING id INTO v_perfil;

  UPDATE perfis SET perfil_acesso_id = v_perfil, operador_dados = true, ativo = true
  WHERE id = v_user;

  RAISE NOTICE 'Pronto: % é administrador da ILPI "%". Já pode entrar no sistema.', v_email, v_ilpi_nome;
END $$;
