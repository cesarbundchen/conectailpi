// =================================================================
// ConectaILPI SaaS — lib/db.ts
// Funções de banco portadas do Apps Script (Modulos.gs / Residentes.gs)
// Todas recebem o client Supabase autenticado + ilpi_id (multi-tenant)
// =================================================================
import type { SupabaseClient } from '@supabase/supabase-js'

type SB = SupabaseClient

// ── HISTÓRICO (auditoria) ────────────────────────────────────────
export async function registrarHistorico(
  sb: SB, ilpi_id: string, modulo: string, acao: string,
  descricao: string, residente_id?: string, usuario_id?: string
) {
  await sb.from('historico').insert({
    ilpi_id, modulo, acao, descricao,
    residente_id: residente_id ?? null,
    usuario_id: usuario_id ?? null,
  })
}

// ── RESIDENTES ───────────────────────────────────────────────────
export async function listarResidentes(
  sb: SB, ilpi_id: string,
  params?: { status?: string; busca?: string }
) {
  let q = sb.from('residentes').select('*').eq('ilpi_id', ilpi_id).order('nome')
  if (params?.status) q = q.eq('status', params.status)
  if (params?.busca) {
    // Remove caracteres com significado na sintaxe de filtro do PostgREST
    const b = params.busca.replace(/[,()%\\]/g, ' ').trim().slice(0, 60)
    if (b) q = q.or(`nome.ilike.%${b}%,cpf.ilike.%${b}%,quarto.ilike.%${b}%`)
  }
  return q
}

export async function getProntuario(sb: SB, id: string) {
  const [residente, medicamentos, ocorrencias, atendimentos, restricoes, financeiro, documentos, responsaveis] =
    await Promise.all([
      sb.from('residentes').select('*').eq('id', id).single(),
      sb.from('medicamentos').select('*').eq('residente_id', id).eq('arquivado', false).order('nome_medicamento'),
      sb.from('ocorrencias').select('*').eq('residente_id', id).eq('arquivado', false).order('criado_em', { ascending: false }).limit(20),
      sb.from('atendimentos').select('*').eq('residente_id', id).eq('arquivado', false).order('data_hora', { ascending: false }).limit(20),
      sb.from('restricoes').select('*').eq('residente_id', id).eq('arquivado', false),
      sb.from('financeiro').select('*').eq('residente_id', id).eq('arquivado', false).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(12),
      sb.from('documentos').select('*').eq('residente_id', id).eq('arquivado', false),
      sb.from('responsaveis').select('*').eq('residente_id', id).eq('arquivado', false),
    ])
  if (residente.error || !residente.data) return null
  return {
    residente: residente.data,
    medicamentos: medicamentos.data ?? [],
    ocorrencias: ocorrencias.data ?? [],
    atendimentos: atendimentos.data ?? [],
    restricoes: restricoes.data ?? [],
    financeiro: financeiro.data ?? [],
    documentos: documentos.data ?? [],
    responsaveis: responsaveis.data ?? [],
  }
}

export async function salvarResidente(
  sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string
) {
  if (dados.id) {
    const { id, ...campos } = dados
    const { data, error } = await sb
      .from('residentes')
      .update(campos)
      .eq('id', id as string)
      .eq('ilpi_id', ilpi_id)
      .select()
      .single()
    if (!error) await registrarHistorico(sb, ilpi_id, 'Residentes', 'Atualização', `Dados atualizados: ${dados.nome}`, id as string, usuario_id)
    return { data, error }
  }
  const { data, error } = await sb
    .from('residentes')
    .insert({ ...dados, ilpi_id, criado_por: usuario_id })
    .select()
    .single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Residentes', 'Cadastro', `Nova residente: ${dados.nome}`, data.id, usuario_id)
  return { data, error }
}

export async function registrarSaida(
  sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string
) {
  const novoStatus = dados.tipo_saida === 'Obito' ? 'Falecida' : 'Inativa'
  const [saida, upd] = await Promise.all([
    sb.from('saidas').insert({ ...dados, ilpi_id, criado_por: usuario_id }).select().single(),
    sb.from('residentes').update({ status: novoStatus }).eq('id', dados.residente_id as string).eq('ilpi_id', ilpi_id),
  ])
  if (!saida.error) {
    await registrarHistorico(sb, ilpi_id, 'Residentes', 'Saída', `Tipo: ${dados.tipo_saida}`, dados.residente_id as string, usuario_id)
  }
  return { data: saida.data, error: saida.error ?? upd.error, novoStatus }
}

// ── SUB-CADASTROS DA ADMISSÃO ────────────────────────────────────
export async function salvarResponsavel(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  const { data, error } = await sb.from('responsaveis').insert({ ...dados, ilpi_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Responsáveis', 'Cadastro', `Responsável: ${dados.nome}`, dados.residente_id as string, usuario_id)
  return { data, error }
}

export async function salvarMedicamento(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  const { data, error } = await sb.from('medicamentos').insert({ ...dados, ilpi_id, status: 'Ativo', criado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Medicamentos', 'Nova prescrição', `${dados.nome_medicamento}`, dados.residente_id as string, usuario_id)
  return { data, error }
}

export async function salvarRestricao(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  const { data, error } = await sb.from('restricoes').insert({ ...dados, ilpi_id, status: 'Ativa', criado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Restrições', 'Registro', `${dados.tipo}: ${dados.descricao}`, dados.residente_id as string, usuario_id)
  return { data, error }
}


// =================================================================
// SPRINT 2 — MÓDULOS CLÍNICOS
// =================================================================

// ── MEDICAMENTOS ─────────────────────────────────────────────────
export async function listarMedicamentos(sb: SB, ilpi_id: string, params?: { residente_id?: string; status?: string }) {
  let q = sb.from('medicamentos').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('nome_medicamento')
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  if (params?.status) q = q.eq('status', params.status)
  return q
}

export async function atualizarMedicamento(sb: SB, ilpi_id: string, id: string, dados: Record<string, unknown>, usuario_id?: string) {
  const { data, error } = await sb.from('medicamentos').update(dados).eq('id', id).eq('ilpi_id', ilpi_id).select().single()
  if (!error && data) {
    const acao = dados.arquivado ? 'Arquivamento' : dados.status ? `Status → ${dados.status}` : 'Atualização'
    await registrarHistorico(sb, ilpi_id, 'Medicamentos', acao, `${data.nome_medicamento}`, data.residente_id, usuario_id)
  }
  return { data, error }
}

export async function registrarAdministracao(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  const { data, error } = await sb.from('administracoes').insert({ ...dados, ilpi_id, administrado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Medicamentos', 'Administração', `${dados.horario} — ${dados.status}`, dados.residente_id as string, usuario_id)
  return { data, error }
}

// ── OCORRÊNCIAS ──────────────────────────────────────────────────
export async function listarOcorrencias(sb: SB, ilpi_id: string, params?: { residente_id?: string; status?: string }) {
  let q = sb.from('ocorrencias').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('criado_em', { ascending: false })
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  if (params?.status) q = q.eq('status', params.status)
  return q
}

export async function salvarOcorrencia(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  if (dados.id) {
    const { id, ...campos } = dados
    if (campos.status === 'Resolvida') {
      campos.resolvido_em = new Date().toISOString()
      campos.resolvido_por = usuario_id
    }
    const { data, error } = await sb.from('ocorrencias').update(campos).eq('id', id as string).eq('ilpi_id', ilpi_id).select().single()
    if (!error && data) await registrarHistorico(sb, ilpi_id, 'Ocorrências', `Status → ${campos.status ?? 'atualizada'}`, data.tipo_ocorrencia, data.residente_id, usuario_id)
    return { data, error }
  }
  const { data, error } = await sb.from('ocorrencias').insert({ ...dados, ilpi_id, status: dados.status ?? 'Aberta', registrado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Ocorrências', 'Registro', `${dados.tipo_ocorrencia}`, data.residente_id, usuario_id)
  return { data, error }
}

// ── ATENDIMENTOS ─────────────────────────────────────────────────
export async function listarAtendimentos(sb: SB, ilpi_id: string, params?: { residente_id?: string }) {
  let q = sb.from('atendimentos').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('data_hora', { ascending: false })
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  return q
}

export async function salvarAtendimento(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  if (dados.id) {
    const { id, ...campos } = dados
    const { data, error } = await sb.from('atendimentos').update(campos).eq('id', id as string).eq('ilpi_id', ilpi_id).select().single()
    return { data, error }
  }
  const { data, error } = await sb.from('atendimentos').insert({ ...dados, ilpi_id, criado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Atendimentos', 'Registro', `${dados.tipo_atendimento} — Dr. ${dados.medico_nome ?? ''}`, data.residente_id, usuario_id)
  return { data, error }
}

// ── RESTRIÇÕES ───────────────────────────────────────────────────
export async function listarRestricoes(sb: SB, ilpi_id: string, params?: { residente_id?: string; status?: string }) {
  let q = sb.from('restricoes').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('gravidade')
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  if (params?.status) q = q.eq('status', params.status)
  return q
}

export async function atualizarRestricao(sb: SB, ilpi_id: string, id: string, dados: Record<string, unknown>, usuario_id?: string) {
  const { data, error } = await sb.from('restricoes').update(dados).eq('id', id).eq('ilpi_id', ilpi_id).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Restrições', dados.arquivado ? 'Arquivamento' : `Status → ${dados.status}`, `${data.tipo}: ${data.descricao}`, data.residente_id, usuario_id)
  return { data, error }
}

// =================================================================
// SPRINT 3 — MÓDULOS DE GESTÃO
// =================================================================

// ── FINANCEIRO ───────────────────────────────────────────────────
export async function listarFinanceiro(sb: SB, ilpi_id: string, params?: { residente_id?: string; mes?: number; ano?: number }) {
  let q = sb.from('financeiro').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false)
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  if (params?.mes) q = q.eq('mes', params.mes)
  if (params?.ano) q = q.eq('ano', params.ano)
  return q.order('ano', { ascending: false }).order('mes', { ascending: false })
}

export async function salvarLancamento(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  if (dados.id) {
    const { id, ...campos } = dados
    const { data, error } = await sb.from('financeiro').update(campos).eq('id', id as string).eq('ilpi_id', ilpi_id).select().single()
    if (!error && data) await registrarHistorico(sb, ilpi_id, 'Financeiro', `Pagamento — ${campos.status}`, `${data.mes}/${data.ano}: R$ ${campos.valor_pago ?? 0}`, data.residente_id, usuario_id)
    return { data, error }
  }
  const { data, error } = await sb.from('financeiro').insert({ ...dados, ilpi_id, criado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Financeiro', 'Lançamento', `${dados.mes}/${dados.ano}`, data.residente_id, usuario_id)
  return { data, error }
}

// ── DOCUMENTOS ───────────────────────────────────────────────────
export async function listarDocumentos(sb: SB, ilpi_id: string, params?: { residente_id?: string }) {
  let q = sb.from('documentos').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('criado_em', { ascending: false })
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  return q
}

export async function salvarDocumento(sb: SB, ilpi_id: string, dados: Record<string, unknown>, usuario_id?: string) {
  if (dados.id) {
    const { id, ...campos } = dados
    const { data, error } = await sb.from('documentos').update(campos).eq('id', id as string).eq('ilpi_id', ilpi_id).select().single()
    return { data, error }
  }
  const { data, error } = await sb.from('documentos').insert({ ...dados, ilpi_id, criado_por: usuario_id }).select().single()
  if (!error && data) await registrarHistorico(sb, ilpi_id, 'Documentos', 'Cadastro', `${dados.tipo}: ${dados.nome}`, data.residente_id, usuario_id)
  return { data, error }
}

// ── RESPONSÁVEIS (lista + editar) ────────────────────────────────
export async function listarResponsaveis(sb: SB, ilpi_id: string, params?: { residente_id?: string }) {
  let q = sb.from('responsaveis').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('nome')
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  return q
}

export async function atualizarResponsavel(sb: SB, ilpi_id: string, id: string, dados: Record<string, unknown>) {
  return sb.from('responsaveis').update(dados).eq('id', id).eq('ilpi_id', ilpi_id).select().single()
}

// ── HISTÓRICO ────────────────────────────────────────────────────
export async function listarHistorico(sb: SB, ilpi_id: string, params?: { residente_id?: string; modulo?: string; limite?: number }) {
  let q = sb.from('historico').select('*, residentes(nome)').eq('ilpi_id', ilpi_id).order('criado_em', { ascending: false }).limit(params?.limite ?? 100)
  if (params?.residente_id) q = q.eq('residente_id', params.residente_id)
  if (params?.modulo) q = q.eq('modulo', params.modulo)
  return q
}
