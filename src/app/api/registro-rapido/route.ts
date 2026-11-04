// Registro de Cuidados — tela única da cuidadora para lançar, na hora,
// o que acontece com a residente: medicação, sinais vitais avulsos e
// intercorrências (vômito, desmaio, tontura, náusea, dor de barriga, outro).
// Cada lançamento vai para a tabela certa (administracoes / sinais_vitais /
// ocorrencias) — a cuidadora não precisa saber disso, só ver "salvo ✓".
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { exigir } from '@/lib/permissoes'
import { registrarAdministracao, salvarOcorrencia } from '@/lib/db'

const ROTULO_SINTOMA: Record<string, string> = {
  vomito: 'Vômito',
  desmaio: 'Desmaio',
  tontura: 'Tontura',
  nausea: 'Náusea',
  dor_barriga: 'Dor de barriga',
}
const TIPOS_SINTOMA = Object.keys(ROTULO_SINTOMA)

// Sempre tratado como urgente, independente do que a cuidadora marcar —
// desmaio nunca é "espera até depois"
const SEMPRE_URGENTE = new Set(['desmaio'])

export async function GET(req: NextRequest) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  const negado = exigir(ctx as any, 'registro', 'ver')
  if (negado) return negado
  try {
    const hoje = new Date().toISOString().split('T')[0]
    const [residentes, medicamentos, administracoesHoje, sinaisHoje, ocorrenciasHoje] = await Promise.all([
      ctx.sb.from('residentes').select('id, nome, quarto').eq('ilpi_id', ctx.ilpi_id).eq('status', 'Ativa').order('quarto'),
      ctx.sb.from('medicamentos').select('id, residente_id, nome_medicamento, dosagem, horarios, controlado')
        .eq('ilpi_id', ctx.ilpi_id).eq('status', 'Ativo').eq('arquivado', false),
      ctx.sb.from('administracoes').select('id, residente_id, medicamento_id, horario, status, criado_em')
        .eq('ilpi_id', ctx.ilpi_id).gte('criado_em', hoje + 'T00:00:00'),
      ctx.sb.from('sinais_vitais').select('id, residente_id, sistolica, diastolica, pulso, alerta, criado_em')
        .eq('ilpi_id', ctx.ilpi_id).eq('arquivado', false).gte('criado_em', hoje + 'T00:00:00').order('criado_em', { ascending: false }),
      ctx.sb.from('ocorrencias').select('id, residente_id, tipo_ocorrencia, status, criado_em')
        .eq('ilpi_id', ctx.ilpi_id).eq('arquivado', false).gte('criado_em', hoje + 'T00:00:00').order('criado_em', { ascending: false }),
    ])
    return respOk({
      residentes: residentes.data ?? [],
      medicamentos: medicamentos.data ?? [],
      administracoesHoje: administracoesHoje.data ?? [],
      sinaisHoje: sinaisHoje.data ?? [],
      ocorrenciasHoje: ocorrenciasHoje.data ?? [],
    })
  } catch (e) { return respErro(e) }
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  const negado = exigir(ctx as any, 'registro', 'incluir')
  if (negado) return negado
  try {
    const b = await req.json()
    if (!b.residente_id) return respErro('Escolha a residente', 400)

    // ── 1) Medicação administrada — reaproveita a tabela/fluxo já existente ──
    if (b.tipo === 'medicacao') {
      if (!b.medicamento_id || !b.horario) return respErro('Escolha o medicamento e o horário', 400)
      const { data, error } = await registrarAdministracao(ctx.sb, ctx.ilpi_id, {
        medicamento_id: b.medicamento_id, residente_id: b.residente_id,
        horario: b.horario, status: b.status || 'Administrado',
        observacoes: b.observacao || null,
      }, ctx.user.id)
      if (error) throw error
      return respOk({ tipo: 'medicacao', registro: data })
    }

    // ── 2) Sinais vitais sob demanda (pressão arterial) ──
    if (b.tipo === 'pressao') {
      const sist = Number(b.sistolica), diast = Number(b.diastolica)
      if (!sist || !diast) return respErro('Informe sistólica e diastólica', 400)
      const alerta = sist >= 180 || sist <= 90 || diast >= 110 || diast <= 60
      const { data, error } = await ctx.sb.from('sinais_vitais').insert({
        ilpi_id: ctx.ilpi_id, residente_id: b.residente_id,
        sistolica: sist, diastolica: diast, pulso: b.pulso ? Number(b.pulso) : null,
        observacao: b.observacao || null, alerta, registrado_por: ctx.user.id,
      }).select().single()
      if (error) throw error

      await ctx.sb.from('historico').insert({
        ilpi_id: ctx.ilpi_id, modulo: 'Registro de cuidados', acao: 'Pressão arterial aferida',
        descricao: `${sist}/${diast} mmHg${alerta ? ' — FORA DA FAIXA' : ''}`,
        residente_id: b.residente_id, usuario_id: ctx.user.id,
      })

      if (alerta) {
        await ctx.sb.from('plantao_itens').insert({
          ilpi_id: ctx.ilpi_id, residente_id: b.residente_id,
          titulo: `Pressão fora da faixa: ${sist}/${diast} mmHg`,
          descricao: b.observacao || 'Registrado no Registro de Cuidados — avaliar residente',
          prioridade: 'Alta', criado_por: ctx.user.id,
        })
      }
      return respOk({ tipo: 'pressao', registro: data, alerta })
    }

    // ── 3) Intercorrências: vômito, desmaio, tontura, náusea, dor de barriga, outro ──
    if (TIPOS_SINTOMA.includes(b.tipo) || b.tipo === 'outro') {
      const rotulo = b.tipo === 'outro' ? (b.outro_label?.trim() || 'Outro') : ROTULO_SINTOMA[b.tipo]
      const urgente = SEMPRE_URGENTE.has(b.tipo) || Boolean(b.urgente)
      const { data, error } = await salvarOcorrencia(ctx.sb, ctx.ilpi_id, {
        residente_id: b.residente_id,
        tipo_ocorrencia: rotulo,
        descricao: b.detalhes?.trim() || rotulo,
        status: urgente ? 'Aberta' : 'Monitorando',
      }, ctx.user.id)
      if (error) throw error

      if (urgente) {
        await ctx.sb.from('plantao_itens').insert({
          ilpi_id: ctx.ilpi_id, residente_id: b.residente_id,
          titulo: rotulo, descricao: b.detalhes?.trim() || 'Registrado no Registro de Cuidados',
          prioridade: 'Alta', criado_por: ctx.user.id,
        })
      }
      return respOk({ tipo: b.tipo, registro: data, urgente })
    }

    return respErro('Tipo de registro inválido', 400)
  } catch (e) { return respErro(e) }
}
