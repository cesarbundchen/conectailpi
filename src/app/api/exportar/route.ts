// Exportação de dados — LGPD (portabilidade) e backup
// ?escopo=residente&residente_id=X  → prontuário completo de uma residente
// ?escopo=ilpi                      → TODOS os dados da instituição
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

// Tabelas vinculadas a residentes (exportáveis nos dois escopos)
const TABELAS = ['residentes', 'medicamentos', 'administracoes', 'ocorrencias',
  'atendimentos', 'restricoes', 'financeiro', 'documentos', 'responsaveis', 'saidas', 'historico',
  'plantao_itens', 'hidratacao', 'dietas', 'rondas', 'avaliacoes', 'sinais_vitais'] as const
// Tabelas da ILPI sem vínculo com residente (apenas no backup completo)
const TABELAS_SO_ILPI = ['plantoes', 'perfis_acesso', 'solicitacoes', 'acoes_criticas'] as const

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (!['admin', 'coordenador'].includes(ctx.papel)) return respErro('Exportação restrita a admin/coordenador', 403)
  try {
    const p = req.nextUrl.searchParams
    const escopo = p.get('escopo') ?? 'ilpi'
    const residente_id = p.get('residente_id')

    if (escopo === 'residente' && !residente_id) return respErro('residente_id obrigatório', 400)

    const dados: Record<string, unknown[]> = {}
    for (const t of TABELAS) {
      let q = ctx.sb.from(t).select('*').eq('ilpi_id', ctx.ilpi_id)
      if (escopo === 'residente' && t !== 'residentes') q = q.eq('residente_id', residente_id!)
      if (escopo === 'residente' && t === 'residentes') q = q.eq('id', residente_id!)
      const { data, error } = await q
      if (error) throw error
      dados[t] = data ?? []
    }

    // Tabelas sem residente_id — apenas no backup completo da instituição
    if (escopo === 'ilpi') {
      for (const t of TABELAS_SO_ILPI) {
        const { data, error } = await ctx.sb.from(t).select('*').eq('ilpi_id', ctx.ilpi_id)
        if (error) throw error
        dados[t] = data ?? []
      }
    }

    // Dados da ILPI (sem chaves de cobrança) na exportação completa
    if (escopo === 'ilpi') {
      const { data: ilpi } = await ctx.sb.from('ilpis')
        .select('nome, cnpj, telefone, email, endereco, capacidade, plano, criado_em')
        .eq('id', ctx.ilpi_id).single()
      dados['ilpi'] = ilpi ? [ilpi] : []
      const { data: equipe } = await ctx.sb.from('perfis')
        .select('nome, papel, ativo, criado_em').eq('ilpi_id', ctx.ilpi_id)
      dados['equipe'] = equipe ?? []
    }

    // Auditoria da exportação
    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'Sistema', acao: 'Exportação de dados',
      descricao: escopo === 'ilpi' ? 'Backup completo da instituição' : `Prontuário exportado (residente ${residente_id})`,
      residente_id: escopo === 'residente' ? residente_id : null,
      usuario_id: ctx.user.id,
    })

    return respOk({
      exportado_em: new Date().toISOString(),
      escopo, sistema: 'ConectaILPI v1.4',
      aviso_lgpd: 'Dados pessoais sensíveis — armazenar com segurança e descartar quando não mais necessário.',
      ...dados,
    })
  } catch (e) { return respErro(e) }
}
