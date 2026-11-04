# Scripts de apoio (não são migrações)

Rode no SQL Editor do Supabase **depois** das 6 migrações. Não rode estes arquivos como migração.

- `criar_usuario_demo.sql`: transforma um usuário criado em Authentication → Users em administrador de uma ILPI de demonstração. É o jeito mais rápido de ter um login para apresentar o sistema, sem usar o `/cadastro`.
- `liberar_admin_cadastro_antigo.sql`: só para administradores criados pelo `/cadastro` **antes** da correção de 04/11/2026, que entravam sem permissão nos módulos. Cadastros novos já saem com o perfil completo.

Os dois podem ser rodados mais de uma vez sem duplicar dados.
