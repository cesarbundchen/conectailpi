// Dietas individualizadas (mapa de dietas da cozinha)
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

const TIPOS = ['Geral', 'Branda', 'Pastosa', 'Líquida', 'Enteral']

export async function GET() {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const [dietas, res] = await Promise.all([
      ctx.sb.from('dietas').select('*').eq('ilpi_id', ctx.ilpi_id).eq('status', 'Ativa'),
      ctx.sb.from('residentes').select('id, nome, quarto').eq('ilpi_id', ctx.ilpi_id).eq('status', 'Ativa').order('nome'),
    ])
    return respOk({ dietas: dietas.data ?? [], residentes: res.data ?? [] })
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (!['admin', 'coordenador', 'tecnico'].includes(ctx.papel)) return respErro('Prescrição de dieta: técnico ou superior', 403)
  try {
    const b = await req.json()
    if (!b.residente_id || !TIPOS.includes(b.tipo_dieta)) return respErro('Dados inválidos', 400)
    // Inativa a dieta anterior (uma ativa por residente)
    await ctx.sb.from('dietas').update({ status: 'Inativa' })
      .eq('ilpi_id', ctx.ilpi_id).eq('residente_id', b.residente_id).eq('status', 'Ativa')
    const { data, error } = await ctx.sb.from('dietas').insert({
      ilpi_id: ctx.ilpi_id, residente_id: b.residente_id, tipo_dieta: b.tipo_dieta,
      restricoes: b.restricoes || null, suplementos: b.suplementos || null,
      observacoes: b.observacoes || null, prescrito_por: b.prescrito_por || null,
      criado_por: ctx.user.id,
    }).select().single()
    if (error) throw error
    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, residente_id: b.residente_id, modulo: 'Dietas',
      acao: 'Dieta prescrita', descricao: `Tipo: ${b.tipo_dieta}`, usuario_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e) }
}
