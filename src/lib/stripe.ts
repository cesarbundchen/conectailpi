// =================================================================
// Stripe — PREPARADO, DESATIVADO
// Ativa automaticamente quando STRIPE_SECRET_KEY existir no ambiente.
// Enquanto desativado, os planos são geridos manualmente em /admin.
// Guia completo de ativação: STRIPE.md na raiz do projeto.
// =================================================================

export const stripeAtivo = !!process.env.STRIPE_SECRET_KEY

export const PLANOS = {
  gratuito:  { nome: 'Gratuito',  preco: 0,   limite_residentes: 10 },
  essencial: { nome: 'Essencial', preco: 97,  limite_residentes: 30 },
  completo:  { nome: 'Completo',  preco: 197, limite_residentes: 999 },
} as const

export type Plano = keyof typeof PLANOS

// Quando ativar o Stripe:
// 1. npm install stripe
// 2. Descomentar STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET no Vercel
// 3. Seguir STRIPE.md (checkout, webhook, portal do cliente)
