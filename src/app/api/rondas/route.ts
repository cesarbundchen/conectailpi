// Controle de rondas (noturnas/diurnas)
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

const SITUACOES = ['Dormindo', 'Acordada tranquila', 'Agitada', 'Necessitou atendimento']

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const data = req.nextUrl.searchParams.get('data') ?? new Date().toISOString().split('T')[0]
    const [regs, res] = await Promise.all([
      ctx.sb.from('rondas').select('*, residentes(nome)').eq('ilpi_id', ctx.ilpi_id)
        .gte('data_hora', data + 'T00:00:00').lte('data_hora', data + 'T23:59:59')
        .order('data_hora', { ascending: false }),
      ctx.sb.from('residentes').select('id, nome, quarto').eq('ilpi_id', ctx.ilpi_id).eq('status', 'Ativa').order('quarto'),
    ])
    return respOk({ registros: regs.data ?? [], residentes: res.data ?? [], data })
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const { residente_id, situacao, observacao } = await req.json()
    if (!residente_id || !SITUACOES.includes(situacao)) return respErro('Situação inválida', 400)
    const { data, error } = await ctx.sb.from('rondas').insert({
      ilpi_id: ctx.ilpi_id, residente_id, situacao,
      observacao: observacao || null, registrado_por: ctx.user.id,
    }).select().single()
    if (error) throw error
    // Atendimento na ronda vira item automático no quadro de plantão
    if (situacao === 'Necessitou atendimento') {
      await ctx.sb.from('plantao_itens').insert({
        ilpi_id: ctx.ilpi_id, residente_id,
        titulo: 'Atendimento durante a ronda', descricao: observacao || 'Registrado na ronda',
        prioridade: 'Alta', criado_por: ctx.user.id,
      })
    }
    return respOk(data)
  } catch (e) { return respErro(e) }
}
