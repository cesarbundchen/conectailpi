// Relatórios personalizados — agrega dados por escopo e período
// ?escopo=instituicao|residente|colaborador & id=... & de=YYYY-MM-DD & ate=YYYY-MM-DD
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

export async function GET(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const p = req.nextUrl.searchParams
    const escopo = p.get('escopo') ?? 'instituicao'
    const id = p.get('id')
    const de = p.get('de') || '2000-01-01'
    const ate = (p.get('ate') || '2100-01-01') + 'T23:59:59'

    if (escopo === 'residente') {
      if (!id) return respErro('id da residente obrigatório', 400)
      const [res, meds, adms, ocs, ats, fins, rests] = await Promise.all([
        ctx.sb.from('residentes').select('*').eq('id', id).single(),
        ctx.sb.from('medicamentos').select('*').eq('residente_id', id).eq('arquivado', false),
        ctx.sb.from('administracoes').select('*').eq('residente_id', id).gte('criado_em', de).lte('criado_em', ate),
        ctx.sb.from('ocorrencias').select('*').eq('residente_id', id).eq('arquivado', false).gte('data_hora', de).lte('data_hora', ate),
        ctx.sb.from('atendimentos').select('*').eq('residente_id', id).eq('arquivado', false).gte('data_hora', de).lte('data_hora', ate),
        ctx.sb.from('financeiro').select('*').eq('residente_id', id).eq('arquivado', false),
        ctx.sb.from('restricoes').select('*').eq('residente_id', id).eq('status', 'Ativa').eq('arquivado', false),
      ])
      if (res.error || !res.data) return respErro('Residente não encontrada', 404)
      const a = adms.data ?? []
      const adesao = a.length ? Math.round(100 * a.filter(x => x.status === 'Administrado').length / a.length) : null
      return respOk({
        residente: res.data,
        indicadores: {
          medicamentos_ativos: (meds.data ?? []).filter(m => m.status === 'Ativo').length,
          administracoes: a.length, adesao_medicacao: adesao,
          recusas: a.filter(x => x.status === 'Recusado').length,
          ocorrencias: (ocs.data ?? []).length,
          ocorrencias_abertas: (ocs.data ?? []).filter(o => o.status !== 'Resolvida').length,
          atendimentos: (ats.data ?? []).length,
          restricoes_ativas: (rests.data ?? []).length,
        },
        medicamentos: meds.data ?? [], ocorrencias: ocs.data ?? [],
        atendimentos: ats.data ?? [], financeiro: fins.data ?? [], restricoes: rests.data ?? [],
      })
    }

    if (escopo === 'colaborador') {
      if (!id) return respErro('id do colaborador obrigatório', 400)
      const [perfil, adms, ocsReg, ocsRes, hist] = await Promise.all([
        ctx.sb.from('perfis').select('id, nome, papel, ativo, criado_em').eq('id', id).eq('ilpi_id', ctx.ilpi_id).single(),
        ctx.sb.from('administracoes').select('*, residentes(nome)').eq('ilpi_id', ctx.ilpi_id).eq('administrado_por', id).gte('criado_em', de).lte('criado_em', ate),
        ctx.sb.from('ocorrencias').select('*, residentes(nome)').eq('ilpi_id', ctx.ilpi_id).eq('registrado_por', id).gte('data_hora', de).lte('data_hora', ate),
        ctx.sb.from('ocorrencias').select('id').eq('ilpi_id', ctx.ilpi_id).eq('resolvido_por', id).gte('criado_em', de).lte('criado_em', ate),
        ctx.sb.from('historico').select('modulo, acao, descricao, criado_em, residentes(nome)').eq('ilpi_id', ctx.ilpi_id).eq('usuario_id', id).gte('criado_em', de).lte('criado_em', ate).order('criado_em', { ascending: false }).limit(100),
      ])
      if (perfil.error || !perfil.data) return respErro('Colaborador não encontrado', 404)
      const a = adms.data ?? []
      return respOk({
        colaborador: perfil.data,
        indicadores: {
          administracoes: a.length,
          administradas_ok: a.filter(x => x.status === 'Administrado').length,
          recusas_registradas: a.filter(x => x.status === 'Recusado').length,
          ocorrencias_registradas: (ocsReg.data ?? []).length,
          ocorrencias_resolvidas: (ocsRes.data ?? []).length,
          total_acoes: (hist.data ?? []).length,
        },
        administracoes: a, ocorrencias: ocsReg.data ?? [], acoes: hist.data ?? [],
      })
    }

    // escopo = instituição
    const [res, meds, adms, ocs, ats, fins, equipe] = await Promise.all([
      ctx.sb.from('residentes').select('id, nome, status, quarto, grau_dependencia, data_admissao').eq('ilpi_id', ctx.ilpi_id),
      ctx.sb.from('medicamentos').select('id, status, controlado').eq('ilpi_id', ctx.ilpi_id).eq('arquivado', false),
      ctx.sb.from('administracoes').select('status, criado_em').eq('ilpi_id', ctx.ilpi_id).gte('criado_em', de).lte('criado_em', ate),
      ctx.sb.from('ocorrencias').select('tipo_ocorrencia, status, data_hora, residentes(nome)').eq('ilpi_id', ctx.ilpi_id).eq('arquivado', false).gte('data_hora', de).lte('data_hora', ate),
      ctx.sb.from('atendimentos').select('tipo_atendimento, data_hora').eq('ilpi_id', ctx.ilpi_id).eq('arquivado', false).gte('data_hora', de).lte('data_hora', ate),
      ctx.sb.from('financeiro').select('mes, ano, mensalidade, extras, valor_pago, status').eq('ilpi_id', ctx.ilpi_id).eq('arquivado', false),
      ctx.sb.from('perfis').select('nome, papel, ativo').eq('ilpi_id', ctx.ilpi_id),
    ])
    const rs = res.data ?? [], a = adms.data ?? [], oc = ocs.data ?? [], fin = fins.data ?? []
    const porTipo: Record<string, number> = {}
    for (const o of oc) porTipo[o.tipo_ocorrencia] = (porTipo[o.tipo_ocorrencia] ?? 0) + 1
    return respOk({
      indicadores: {
        residentes_total: rs.length,
        residentes_ativas: rs.filter(r => r.status === 'Ativa').length,
        equipe_ativa: (equipe.data ?? []).filter(e => e.ativo).length,
        medicamentos_ativos: (meds.data ?? []).filter(m => m.status === 'Ativo').length,
        controlados: (meds.data ?? []).filter(m => m.controlado && m.status === 'Ativo').length,
        adesao_medicacao: a.length ? Math.round(100 * a.filter(x => x.status === 'Administrado').length / a.length) : null,
        ocorrencias: oc.length,
        ocorrencias_abertas: oc.filter(o => o.status !== 'Resolvida').length,
        atendimentos: (ats.data ?? []).length,
        receita_prevista: fin.reduce((s, f) => s + Number(f.mensalidade) + Number(f.extras ?? 0), 0),
        receita_recebida: fin.reduce((s, f) => s + Number(f.valor_pago ?? 0), 0),
        inadimplentes: fin.filter(f => f.status === 'Atrasado').length,
      },
      ocorrencias_por_tipo: porTipo,
      residentes: rs, ocorrencias: oc, atendimentos: ats.data ?? [], equipe: equipe.data ?? [],
    })
  } catch (e) { return respErro(e) }
}
