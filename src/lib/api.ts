// Helper compartilhado por todas as API Routes
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function requireUser() {
  const sb = createServerSupabase()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) return { erro: NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 }) }

  // Nível 1 — equipe da plataforma (Conecta ILPI)
  const { data: plat } = await sb.from('plataforma_usuarios')
    .select('nivel, ativo').eq('id', user.id).maybeSingle()

  // Níveis 2 e 3 — usuário de uma instituição, com seu perfil de acesso
  const { data: perfil } = await sb.from('perfis')
    .select('ilpi_id, papel, nome, ativo, operador_dados, vinculo_expira_em, perfis_acesso(nome, permissoes, ativo)')
    .eq('id', user.id).single()

  if (!perfil && !plat) return { erro: NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 403 }) }
  if (perfil?.ativo === false) return { erro: NextResponse.json({ ok: false, erro: 'Usuário desativado' }, { status: 403 }) }

  // Vínculo temporário vencido (voluntário/terceirizado) = acesso negado
  if (perfil?.vinculo_expira_em && new Date(perfil.vinculo_expira_em) < new Date(new Date().toDateString())) {
    return { erro: NextResponse.json({ ok: false, erro: 'Seu vínculo com a instituição expirou. Procure o Operador de Dados.' }, { status: 403 }) }
  }

  const pa: any = perfil?.perfis_acesso
  if (perfil && pa?.ativo === false) {
    return { erro: NextResponse.json({ ok: false, erro: 'Seu perfil de acesso foi desativado.' }, { status: 403 }) }
  }

  return {
    sb, user,
    ilpi_id: perfil?.ilpi_id as string,
    papel: perfil?.papel as string,                       // legado — remover pós-piloto
    permissoes: (pa?.permissoes ?? []) as string[],
    operador_dados: Boolean(perfil?.operador_dados),
    plataforma: (plat?.ativo ? plat.nivel : null) as 'master' | 'operacao' | 'suporte' | null,
    perfil_nome: (pa?.nome ?? 'sem perfil') as string,
  }
}

export function respOk(dados: unknown) { return NextResponse.json({ ok: true, dados }) }
export function respErro(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Erro interno'
  return NextResponse.json({ ok: false, erro: msg }, { status })
}
