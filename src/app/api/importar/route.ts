// Importação em lote — recebe linhas já parseadas do CSV-modelo
// Valida campo a campo e insere com ilpi_id forçado (nunca confia no arquivo)
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

const CAMPOS: Record<string, string[]> = {
  residentes:   ['nome', 'data_nascimento', 'cpf', 'quarto', 'leito', 'data_admissao', 'grau_dependencia', 'status', 'observacoes'],
  responsaveis: ['residente_nome', 'nome', 'parentesco', 'tipo', 'telefone_principal', 'email'],
  medicamentos: ['residente_nome', 'nome_medicamento', 'dosagem', 'via', 'frequencia', 'horarios', 'medico_nome', 'controlado'],
  financeiro:   ['residente_nome', 'mes', 'ano', 'mensalidade', 'extras', 'valor_pago', 'status'],
}
const STATUS_RES = ['Triagem', 'Ativa', 'Ausente', 'Inativa', 'Falecida']

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (!['admin', 'coordenador'].includes(ctx.papel)) return respErro('Importação restrita a admin/coordenador', 403)
  try {
    const { entidade, linhas } = await req.json()
    if (!CAMPOS[entidade]) return respErro('Entidade inválida', 400)
    if (!Array.isArray(linhas) || linhas.length === 0) return respErro('Nenhuma linha para importar', 400)
    if (linhas.length > 500) return respErro('Máximo de 500 linhas por importação', 400)

    // Mapa nome→id para entidades vinculadas a residentes
    let mapaRes: Record<string, string> = {}
    if (entidade !== 'residentes') {
      const { data } = await ctx.sb.from('residentes').select('id, nome').eq('ilpi_id', ctx.ilpi_id)
      for (const r of data ?? []) mapaRes[String(r.nome).trim().toLowerCase()] = r.id
    }

    const ok: number[] = []
    const erros: { linha: number; erro: string }[] = []

    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i] as Record<string, string>
      try {
        if (entidade === 'residentes') {
          if (!l.nome?.trim()) throw new Error('nome vazio')
          const status = STATUS_RES.includes(l.status) ? l.status : 'Ativa'
          const { error } = await ctx.sb.from('residentes').insert({
            ilpi_id: ctx.ilpi_id, nome: l.nome.trim(),
            data_nascimento: l.data_nascimento || null, cpf: l.cpf || null,
            quarto: l.quarto || null, leito: l.leito || null,
            data_admissao: l.data_admissao || null, grau_dependencia: l.grau_dependencia || null,
            status, observacoes: l.observacoes || null, criado_por: ctx.user.id,
          })
          if (error) throw error
        } else {
          const rid = mapaRes[String(l.residente_nome ?? '').trim().toLowerCase()]
          if (!rid) throw new Error(`residente "${l.residente_nome}" não encontrada`)
          if (entidade === 'responsaveis') {
            if (!l.nome?.trim()) throw new Error('nome vazio')
            const { error } = await ctx.sb.from('responsaveis').insert({
              ilpi_id: ctx.ilpi_id, residente_id: rid, nome: l.nome.trim(),
              parentesco: l.parentesco || null,
              tipo: ['Financeiro', 'Familiar', 'Ambos'].includes(l.tipo) ? l.tipo : 'Familiar',
              telefone_principal: l.telefone_principal || null, email: l.email || null,
            })
            if (error) throw error
          }
          if (entidade === 'medicamentos') {
            if (!l.nome_medicamento?.trim()) throw new Error('medicamento vazio')
            const { error } = await ctx.sb.from('medicamentos').insert({
              ilpi_id: ctx.ilpi_id, residente_id: rid,
              nome_medicamento: l.nome_medicamento.trim(), dosagem: l.dosagem || null,
              via: l.via || null, frequencia: l.frequencia || null,
              horarios: l.horarios ? String(l.horarios).split(/[;|]/).map(h => h.trim()).filter(Boolean) : [],
              medico_nome: l.medico_nome || null,
              controlado: ['sim', 'true', '1'].includes(String(l.controlado).toLowerCase()),
              status: 'Ativo', criado_por: ctx.user.id,
            })
            if (error) throw error
          }
          if (entidade === 'financeiro') {
            const mes = Number(l.mes), ano = Number(l.ano)
            if (!mes || !ano || mes < 1 || mes > 12) throw new Error('mes/ano inválidos')
            const { error } = await ctx.sb.from('financeiro').insert({
              ilpi_id: ctx.ilpi_id, residente_id: rid, mes, ano,
              mensalidade: Number(l.mensalidade) || 0, extras: Number(l.extras) || 0,
              valor_pago: Number(l.valor_pago) || 0,
              status: ['Pendente', 'Pago', 'Parcial', 'Atrasado'].includes(l.status) ? l.status : 'Pendente',
              criado_por: ctx.user.id,
            })
            if (error) throw error
          }
        }
        ok.push(i + 1)
      } catch (e) {
        erros.push({ linha: i + 1, erro: e instanceof Error ? e.message : 'erro' })
      }
    }

    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'Sistema', acao: 'Importação de dados',
      descricao: `${entidade}: ${ok.length} importadas, ${erros.length} com erro`, usuario_id: ctx.user.id,
    })
    return respOk({ importadas: ok.length, erros })
  } catch (e) { return respErro(e) }
}
