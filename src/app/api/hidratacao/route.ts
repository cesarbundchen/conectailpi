// Mapa de hidratação diária
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const data = req.nextUrl.searchParams.get('data') ?? new Date().toISOString().split('T')[0]
    const [regs, res] = await Promise.all([
      ctx.sb.from('hidratacao').select('*').eq('ilpi_id', ctx.ilpi_id).eq('data', data),
      ctx.sb.from('residentes').select('id, nome, quarto, meta_hidratacao_ml').eq('ilpi_id', ctx.ilpi_id).eq('status', 'Ativa').order('nome'),
    ])
    return respOk({ registros: regs.data ?? [], residentes: res.data ?? [], data })
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const { residente_id, volume_ml, tipo, data } = await req.json()
    const v = Number(volume_ml)
    if (!residente_id || !v || v <= 0 || v > 2000) return respErro('Volume inválido (1 a 2000 ml)', 400)
    const { data: reg, error } = await ctx.sb.from('hidratacao').insert({
      ilpi_id: ctx.ilpi_id, residente_id, volume_ml: v,
      tipo: tipo || 'Água', data: data || new Date().toISOString().split('T')[0],
      registrado_por: ctx.user.id,
    }).select().single()
    if (error) throw error
    return respOk(reg)
  } catch (e) { return respErro(e) }
}
