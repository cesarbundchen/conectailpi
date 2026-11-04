# Ativação do Stripe (quando houver clientes pagantes)

O sistema funciona 100% sem Stripe — planos são geridos manualmente em /admin.
Este guia é para o dia em que vocês quiserem cobrança automática por cartão.

## Passo a passo (~2 horas)

1. **Conta Stripe** — criar em stripe.com (Brasil, CNPJ da Conecta ILPI)
2. **Produtos** — criar 2 produtos recorrentes mensais:
   - Essencial: R$ 97/mês
   - Completo: R$ 197/mês
   Anotar os `price_id` de cada um (price_xxx)
3. **Instalar** — `npm install stripe` no projeto
4. **Variáveis no Vercel**:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (criado no passo 6)
5. **Checkout** — criar `src/app/api/stripe/checkout/route.ts` que:
   - recebe o plano desejado, cria uma Checkout Session com o price_id
   - `client_reference_id = ilpi_id`, `success_url = /configuracoes?pago=ok`
6. **Webhook** — criar `src/app/api/stripe/webhook/route.ts` que escuta:
   - `checkout.session.completed` → grava `stripe_customer_id`/`stripe_subscription_id`
     na tabela `ilpis` (colunas já criadas na migration 003) e atualiza `plano`
   - `customer.subscription.deleted` → volta `plano = 'gratuito'`
   Registrar a URL do webhook no painel do Stripe.
7. **Portal do cliente** — ativar o Customer Portal no Stripe para a ILPI
   gerenciar cartão/cancelamento sozinha; link em /configuracoes.

## Por que não ativar agora?
Na validação (5-10 ILPIs no Ceará), PIX manual + alteração de plano em /admin
é mais simples, sem taxas de gateway (Stripe cobra ~4% + R$ 0,40 por transação).
Ative quando o volume justificar.
