import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { registrarAdministracao } from '@/lib/db'

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const { data, error } = await registrarAdministracao(ctx.sb, ctx.ilpi_id, await req.json(), ctx.user.id)
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
