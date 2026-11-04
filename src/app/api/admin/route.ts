// API do painel do operador — restrita a SUPER_ADMIN_EMAILS
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { createAdminSupabase } from '@/lib/supabase'

function ehSuperAdmin(email?: string | null) {
  const lista = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return !!email && lista.includes(email.toLowerCase())
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (!ehSuperAdmin(ctx.user.email)) return respErro('Acesso restrito ao operador do SaaS', 403)
  try {
    const { id, plano, ativo } = await req.json()
    if (!id) return respErro('id obrigatório', 400)

    const campos: Record<string, unknown> = {}
    if (plano && ['gratuito', 'essencial', 'completo'].includes(plano)) campos.plano = plano
    if (typeof ativo === 'boolean') campos.ativo = ativo
    if (Object.keys(campos).length === 0) return respErro('Nada a atualizar', 400)

    const admin = createAdminSupabase()
    const { data, error } = await admin.from('ilpis').update(campos).eq('id', id).select().single()
    if (error) throw error

    await admin.from('historico').insert({
      ilpi_id: id, modulo: 'Sistema', acao: 'Operador SaaS',
      descricao: `Alteração: ${JSON.stringify(campos)}`, usuario_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e) }
}
