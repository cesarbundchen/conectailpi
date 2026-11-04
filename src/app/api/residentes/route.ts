import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { listarResidentes, salvarResidente, registrarSaida } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  try {
    const p = req.nextUrl.searchParams
    const { data, error } = await listarResidentes(ctx.sb, ctx.ilpi_id, {
      status: p.get('status') ?? undefined,
      busca: p.get('busca') ?? undefined,
    })
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  try {
    const body = await req.json()
    if (body._acao === 'saida') {
      const { _acao, ...dados } = body
      const { data, error, novoStatus } = await registrarSaida(ctx.sb, ctx.ilpi_id, dados, ctx.user.id)
      if (error) throw error
      return respOk({ ...data, novoStatus })
    }
    const { data, error } = await salvarResidente(ctx.sb, ctx.ilpi_id, body, ctx.user.id)
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
