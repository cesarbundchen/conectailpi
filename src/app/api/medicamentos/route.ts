import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { listarMedicamentos, salvarMedicamento, atualizarMedicamento } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const p = req.nextUrl.searchParams
    const { data, error } = await listarMedicamentos(ctx.sb, ctx.ilpi_id, {
      residente_id: p.get('residente_id') ?? undefined,
      status: p.get('status') ?? undefined,
    })
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const { data, error } = await salvarMedicamento(ctx.sb, ctx.ilpi_id, await req.json(), ctx.user.id)
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const { id, ...dados } = await req.json()
    if (!id) return respErro('id obrigatório', 400)
    const { data, error } = await atualizarMedicamento(ctx.sb, ctx.ilpi_id, id, dados, ctx.user.id)
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
