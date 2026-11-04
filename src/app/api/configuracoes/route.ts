import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'

export async function GET() {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  try {
    const [ilpi, usuarios] = await Promise.all([
      ctx.sb.from('ilpis').select('*').eq('id', ctx.ilpi_id).single(),
      ctx.sb.from('perfis').select('id, nome, papel, ativo, criado_em').eq('ilpi_id', ctx.ilpi_id).order('nome'),
    ])
    if (ilpi.error) throw ilpi.error
    return respOk({ ilpi: ilpi.data, usuarios: usuarios.data ?? [], meu_papel: ctx.papel })
  } catch (e) { return respErro(e) }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (ctx.papel !== 'admin') return respErro('Apenas administradores', 403)
  try {
    const { nome, cnpj, telefone, email, endereco, capacidade } = await req.json()
    const { data, error } = await ctx.sb.from('ilpis')
      .update({ nome, cnpj, telefone, email, endereco, capacidade })
      .eq('id', ctx.ilpi_id).select().single()
    if (error) throw error
    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'Sistema', acao: 'Configurações',
      descricao: 'Dados da ILPI atualizados', usuario_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e) }
}
