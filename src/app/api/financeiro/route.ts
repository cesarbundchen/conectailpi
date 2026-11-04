import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { listarFinanceiro, salvarLancamento } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const p = req.nextUrl.searchParams
    const { data, error } = await listarFinanceiro(ctx.sb, ctx.ilpi_id, {
      residente_id: p.get('residente_id') ?? undefined,
      mes: p.get('mes') ? Number(p.get('mes')) : undefined,
      ano: p.get('ano') ? Number(p.get('ano')) : undefined,
    })
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (!['admin', 'coordenador'].includes(ctx.papel)) return respErro('Sem permissão para o financeiro', 403)
  try {
    const { data, error } = await salvarLancamento(ctx.sb, ctx.ilpi_id, await req.json(), ctx.user.id)
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
