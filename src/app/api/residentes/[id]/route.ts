import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { getProntuario, salvarResidente } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  try {
    const p = await getProntuario(ctx.sb, params.id)
    if (!p) return respErro('Residente não encontrada', 404)
    return respOk(p)
  } catch (e) { return respErro(e) }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  try {
    const body = await req.json()
    const { data, error } = await salvarResidente(ctx.sb, ctx.ilpi_id, { ...body, id: params.id }, ctx.user.id)
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
