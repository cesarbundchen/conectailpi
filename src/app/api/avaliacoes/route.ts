// Escalas de avaliação com pontuação calculada NO SERVIDOR
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

import { ESCALAS } from '@/lib/escalas'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const residente_id = req.nextUrl.searchParams.get('residente_id')
    let q = ctx.sb.from('avaliacoes').select('*, residentes(nome)').eq('ilpi_id', ctx.ilpi_id)
      .order('criado_em', { ascending: false }).limit(50)
    if (residente_id) q = q.eq('residente_id', residente_id)
    const { data, error } = await q
    if (error) throw error
    return respOk(data ?? [])
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (!['admin', 'coordenador', 'tecnico'].includes(ctx.papel)) return respErro('Aplicação de escalas: técnico ou superior', 403)
  try {
    const { residente_id, escala, respostas } = await req.json()
    const def = ESCALAS[escala]
    if (!residente_id || !def) return respErro('Escala inválida', 400)

    // Recalcula a pontuação no servidor (nunca confia no cliente)
    let pontuacao = 0
    for (const item of def.itens) {
      const r = Number(respostas?.[item.id])
      const valida = item.opcoes.some(o => o.pontos === r)
      if (!valida) return respErro(`Resposta inválida em "${item.rotulo}"`, 400)
      pontuacao += r
    }
    const classificacao = def.classificar(pontuacao)

    const { data, error } = await ctx.sb.from('avaliacoes').insert({
      ilpi_id: ctx.ilpi_id, residente_id, escala, respostas, pontuacao, classificacao,
      aplicado_por: ctx.user.id,
    }).select().single()
    if (error) throw error
    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, residente_id, modulo: 'Avaliações',
      acao: `Escala ${escala} aplicada`, descricao: `${pontuacao} pontos — ${classificacao}`, usuario_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e) }
}
