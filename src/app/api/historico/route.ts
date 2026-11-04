import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { listarHistorico } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const p = req.nextUrl.searchParams
    const { data, error } = await listarHistorico(ctx.sb, ctx.ilpi_id, {
      residente_id: p.get('residente_id') ?? undefined,
      modulo: p.get('modulo') ?? undefined,
      limite: p.get('limite') ? Number(p.get('limite')) : 100,
    })
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
