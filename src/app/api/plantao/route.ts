// Passagem de plantão — kanban de pendências + fechamento de turno
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const [itens, passagens] = await Promise.all([
      ctx.sb.from('plantao_itens').select('*, residentes(nome)').eq('ilpi_id', ctx.ilpi_id)
        .eq('arquivado', false).order('prioridade').order('criado_em', { ascending: false }).limit(200),
      ctx.sb.from('plantoes').select('*').eq('ilpi_id', ctx.ilpi_id).order('criado_em', { ascending: false }).limit(10),
    ])
    return respOk({ itens: itens.data ?? [], passagens: passagens.data ?? [] })
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const b = await req.json()
    if (b.acao === 'fechar_turno') {
      if (!b.resumo?.trim()) return respErro('Resumo do turno é obrigatório', 400)
      if (!['Diurno', 'Noturno'].includes(b.turno)) return respErro('Turno inválido', 400)
      const { data, error } = await ctx.sb.from('plantoes')
        .insert({ ilpi_id: ctx.ilpi_id, turno: b.turno, resumo: b.resumo.trim(), criado_por: ctx.user.id })
        .select().single()
      if (error) throw error
      await ctx.sb.from('historico').insert({
        ilpi_id: ctx.ilpi_id, modulo: 'Plantão', acao: `Passagem de plantão (${b.turno})`,
        descricao: b.resumo.slice(0, 200), usuario_id: ctx.user.id,
      })
      return respOk(data)
    }
    // novo item do quadro
    if (!b.titulo?.trim()) return respErro('Título é obrigatório', 400)
    const { data, error } = await ctx.sb.from('plantao_itens').insert({
      ilpi_id: ctx.ilpi_id, residente_id: b.residente_id || null,
      titulo: b.titulo.trim(), descricao: b.descricao || null,
      prioridade: b.prioridade === 'Alta' ? 'Alta' : 'Normal',
      criado_por: ctx.user.id,
    }).select().single()
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const { id, status } = await req.json()
    if (!id || !['Pendente', 'Em observação', 'Concluída'].includes(status)) return respErro('Dados inválidos', 400)
    const campos: Record<string, unknown> = { status }
    if (status === 'Concluída') { campos.resolvido_em = new Date().toISOString(); campos.resolvido_por = ctx.user.id }
    const { data, error } = await ctx.sb.from('plantao_itens')
      .update(campos).eq('id', id).eq('ilpi_id', ctx.ilpi_id).select().single()
    if (error) throw error
    return respOk(data)
  } catch (e) { return respErro(e) }
}
