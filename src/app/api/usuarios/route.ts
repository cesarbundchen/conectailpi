// Gestão de usuários da equipe — restrito a admins da ILPI
// Criação usa service role (auth.admin), mas SEMPRE vinculada à ILPI do solicitante
import { NextRequest } from 'next/server'
import { requireUser, respOk, respErro } from '@/lib/api'
import { createAdminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (ctx.papel !== 'admin') return respErro('Apenas administradores criam usuários', 403)
  try {
    const { nome, email, senha, papel } = await req.json()
    if (!nome || !email || !senha || senha.length < 8) return respErro('Dados incompletos', 400)
    if (!['admin', 'coordenador', 'tecnico', 'cuidador'].includes(papel)) return respErro('Papel inválido', 400)

    const admin = createAdminSupabase()
    const { data: user, error: e1 } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true })
    if (e1) return respErro(e1.message?.includes('already') ? 'E-mail já cadastrado' : e1.message, 400)

    const { error: e2 } = await admin.from('perfis')
      .insert({ id: user.user.id, ilpi_id: ctx.ilpi_id, nome, papel })
    if (e2) { await admin.auth.admin.deleteUser(user.user.id); throw e2 }

    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'Sistema', acao: 'Novo usuário',
      descricao: `${nome} (${papel})`, usuario_id: ctx.user.id,
    })
    return respOk({ id: user.user.id })
  } catch (e) { return respErro(e) }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(); if ('erro' in ctx) return ctx.erro
  if (ctx.papel !== 'admin') return respErro('Apenas administradores', 403)
  try {
    const { id, ativo, papel } = await req.json()
    if (!id) return respErro('id obrigatório', 400)
    if (id === ctx.user.id && ativo === false) return respErro('Você não pode desativar a si mesmo', 400)

    const campos: Record<string, unknown> = {}
    if (typeof ativo === 'boolean') campos.ativo = ativo
    if (papel && ['admin', 'coordenador', 'tecnico', 'cuidador'].includes(papel)) campos.papel = papel

    const { data, error } = await ctx.sb.from('perfis')
      .update(campos).eq('id', id).eq('ilpi_id', ctx.ilpi_id).select().single()
    if (error) throw error

    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'Sistema', acao: 'Usuário atualizado',
      descricao: `${data.nome}: ${JSON.stringify(campos)}`, usuario_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e) }
}
