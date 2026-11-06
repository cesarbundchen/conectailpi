# CareILPI SaaS v1.1 — Conecta ILPI

Sistema multi-tenant de gestão para Instituições de Longa Permanência para Idosos.
Stack: **Next.js 14 + Supabase (PostgreSQL/Auth) + Vercel ou Netlify**. Planos gratuitos servem para testes; uso comercial exige plano pago na Vercel.

## Módulos (Sprints 1–5, todos concluídos)

| Módulo | O que faz |
|---|---|
| Dashboard | Métricas em tempo real da ILPI |
| Residentes | Lista, busca, prontuário 7 abas, admissão em 7 etapas, saída (alta/óbito) |
| Medicamentos | Prescrições, administração com horário, suspender/arquivar, controlados |
| Ocorrências | Registro → monitorar → resolver, notificação da família, visibilidade no portal |
| Atendimentos | Consultas com CID-10, CRM, conduta e retorno |
| Restrições | Alergias e restrições com gravidade, alerta no prontuário |
| Financeiro | Mensalidades, pagamentos, inadimplência por mês |
| Documentos | Cadastro com link, visibilidade no portal |
| Responsáveis | CRUD com autorização de retirada |
| Histórico | Auditoria imutável (ANVISA RDC 502 / LGPD) |
| Relatórios | Dashboards por instituição, residente ou colaboradora + PDF |
| Importar/Exportar | Migração por planilha-modelo CSV + backup total (LGPD) |
| Portal da família | Link público por token, sem senha |
| Cadastro de ILPI | Onboarding com código de convite |
| Painel do operador | Gestão das ILPIs (só Conecta ILPI), planos, suspensão |
| Configurações | Dados da ILPI + gestão de usuários por papel |

## Deploy (roteiro resumido — detalhes no CareILPI_Tutorial_Deploy.pdf)

1. **GitHub**: subir este projeto em repositório **privado**
2. **Supabase**: criar projeto → SQL Editor → executar **as 6 migrações, uma por vez e na ordem**:
   `001_schema.sql` → `002_rls.sql` → `003_saas.sql` → `004_cuidado_diario.sql` → `005_rbac.sql` → `006_sinais_vitais.sql`
3. **Auth**: em Authentication → URL Configuration, colocar o endereço publicado como Site URL
4. **Primeira ILPI**: após o deploy, acessar `/cadastro` e usar o INVITE_SECRET.
   O cadastro já cria o perfil "Administrador da instituição" com todas as permissões e marca o admin como Operador de Dados.
5. **Hospedagem** (Vercel ou Netlify): importar o repositório e definir as variáveis.
   Atenção: o plano gratuito da Vercel (Hobby) é só para uso não comercial; para clientes, usar Vercel Pro ou Netlify.

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → botão **Connect** (endereço `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys: chave **anon** ou **publishable** (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys: chave **service_role** ou **secret** (`sb_secret_...`) (⚠ secreta) |
| `NEXT_PUBLIC_APP_URL` | URL do deploy (ex.: https://careilpi.vercel.app) |
| `INVITE_SECRET` | Você inventa um código forte (nunca o valor de exemplo) — é o convite das novas ILPIs |
| `SUPER_ADMIN_EMAILS` | E-mails **reais** de quem administra a plataforma, separados por vírgula |

## Segurança (5 camadas)

1. HTTPS automático (Vercel)
2. Middleware: nenhuma rota interna abre sem sessão JWT
3. APIs revalidam usuário + papel + **usuário ativo** + **ILPI ativa** em toda chamada
4. **RLS no PostgreSQL**: mesmo com bug no código, o banco só entrega dados da ILPI do usuário
5. `noindex` + rate limit no cadastro + sanitização de buscas

## Regras de desenvolvimento (para futuras alterações)

1. Página protegida → sempre dentro de `src/app/(protected)/`
2. Toda query filtra `ilpi_id` (o RLS é a rede de segurança, não a única defesa)
3. **Nunca** deletar registros — usar `arquivado = true`
4. Toda ação relevante grava em `historico` (auditoria)
5. Nunca commitar `.env.local`

## Stripe

Preparado e desativado. Guia de ativação: `STRIPE.md`. Enquanto isso, planos são geridos manualmente em `/admin`.

---
Conecta ILPI © 2026 — Fortaleza/CE · Documento interno

## Testes automatizados (Sprint QA)

- `npm test` → 46 testes unitários/integração (banco simulado): lógica de saída/óbito,
  multi-tenant forçado, resolução de ocorrências, sanitização de busca, validações da
  importação (lote parcial, vínculos por nome, limites), cadastro de ILPI (convite,
  rollback de e-mail duplicado, rate limit 429) e permissões por papel.
- Caixa-preta (com o servidor no ar): rotas públicas 200, todas as internas redirecionam
  sem login (inclusive páginas inexistentes — quem não está logado não descobre rotas),
  APIs bloqueadas, portal não vaza dados com token inválido, busca maliciosa sem 500.

O que a simulação NÃO cobre (validar no piloto — condição C1 do parecer):
login real, RLS com dois usuários de ILPIs diferentes, portal com token válido,
concorrência de digitação simultânea e comportamento no free tier sob uso contínuo.

## Visual v3 e aplicativo (PWA)
- Interface refeita na identidade da marca: azul-petróleo #01435F, turquesa #009E93, laranja #FE8705 e fonte Nunito. Todas as telas herdam o novo visual pelo `src/app/globals.css`; as funções e as rotas continuam as mesmas.
- Menu lateral com ícones próprios (`src/components/ui/Icone.tsx`) que vira gaveta no celular; painel inicial com atalhos; login e cadastro com painel da marca.
- **Instalar como aplicativo:** com o site publicado em HTTPS, o navegador oferece "Instalar app" (Chrome/Edge no computador e no Android) ou "Adicionar à Tela de Início" (Safari no iPhone). O manifesto fica em `src/app/manifest.ts` e os ícones em `public/`.
