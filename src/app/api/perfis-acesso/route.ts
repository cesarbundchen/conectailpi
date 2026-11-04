// Perfis de acesso configuráveis por instituição (nível 2 do RBAC)
import { requireUser, respOk, respErro } from '@/lib/api'
import { exigir } from '@/lib/permissoes'
import { todasPermissoes, PERFIS_MODELO } from '@/lib/modulos'

export async function GET() {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  const negado = exigir(ctx as any, 'usuarios', 'ver')
  if (negado) return negado
  try {
    const { data: perfis, error } = await ctx.sb.from('perfis_acesso')
      .select('*').eq('ilpi_id', ctx.ilpi_id).order('nome')
    if (error) throw error

    // Quantas pessoas usam cada perfil (impede excluir perfil em uso)
    const { data: usos } = await ctx.sb.from('perfis')
      .select('perfil_acesso_id').eq('ilpi_id', ctx.ilpi_id).eq('ativo', true)
    const contagem: Record<string, number> = {}
    for (const u of usos ?? []) if (u.perfil_acesso_id) contagem[u.perfil_acesso_id] = (contagem[u.perfil_acesso_id] ?? 0) + 1

    return respOk({ perfis: perfis ?? [], contagem, modelos: PERFIS_MODELO })
  } catch (e) { return respErro(e) }
}

export async function POST(req: Request) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  const negado = exigir(ctx as any, 'usuarios', 'incluir')
  if (negado) return negado
  try {
    const b = await req.json()
    if (!b.nome?.trim()) throw new Error('Dê um nome ao perfil')

    // Só aceita permissões que existem no registro de módulos
    const validas = new Set(todasPermissoes())
    const permissoes = (b.permissoes ?? []).filter((p: string) => validas.has(p))

    const { data, error } = await ctx.sb.from('perfis_acesso').insert({
      ilpi_id: ctx.ilpi_id,
      nome: b.nome.trim(),
      descricao: b.descricao ?? null,
      formacoes: b.formacoes ?? null,
      vinculo: b.vinculo ?? 'proprio',
      permissoes,
    }).select().single()
    if (error) throw error.code === '23505' ? new Error('Já existe um perfil com esse nome') : error

    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'usuarios', acao: 'Perfil de acesso criado',
      descricao: `${b.nome} — ${permissoes.length} permissões`, autor_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e, 400) }
}

export async function PATCH(req: Request) {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  const negado = exigir(ctx as any, 'usuarios', 'editar')
  if (negado) return negado
  try {
    const b = await req.json()
    if (!b.id) throw new Error('Perfil não informado')

    const { data: atual } = await ctx.sb.from('perfis_acesso')
      .select('protegido, nome').eq('id', b.id).eq('ilpi_id', ctx.ilpi_id).single()
    if (!atual) throw new Error('Perfil não encontrado')
    if (atual.protegido) throw new Error('O perfil de administrador é protegido e não pode ser alterado')

    const validas = new Set(todasPermissoes())
    const patch: Record<string, unknown> = {}
    for (const k of ['nome', 'descricao', 'formacoes', 'vinculo', 'ativo']) if (k in b) patch[k] = b[k]
    if (b.permissoes) patch.permissoes = b.permissoes.filter((p: string) => validas.has(p))

    const { data, error } = await ctx.sb.from('perfis_acesso')
      .update(patch).eq('id', b.id).eq('ilpi_id', ctx.ilpi_id).select().single()
    if (error) throw error

    await ctx.sb.from('historico').insert({
      ilpi_id: ctx.ilpi_id, modulo: 'usuarios', acao: 'Perfil de acesso alterado',
      descricao: `${atual.nome}${b.permissoes ? ` — agora com ${patch.permissoes ? (patch.permissoes as string[]).length : 0} permissões` : ''}`,
      autor_id: ctx.user.id,
    })
    return respOk(data)
  } catch (e) { return respErro(e, 400) }
}
