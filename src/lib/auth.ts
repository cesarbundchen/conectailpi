import { createServerSupabase } from './supabase'
import { redirect } from 'next/navigation'

export async function getAuthenticatedUser() {
  const sb = createServerSupabase()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: perfil } = await sb
    .from('perfis')
    .select('*, ilpis(nome, capacidade, plano, ativo)')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  // Usuário desativado pelo admin OU ILPI suspensa pelo operador → sem acesso
  if (perfil.ativo === false) redirect('/login?erro=desativado')
  const ilpiJoin = (perfil as { ilpis?: { ativo?: boolean } }).ilpis
  if (ilpiJoin && ilpiJoin.ativo === false) redirect('/login?erro=suspensa')

  return { user, perfil, ilpi_id: perfil.ilpi_id as string }
}

export async function getUserFromRequest() {
  const sb = createServerSupabase()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) return null

  const { data: perfil } = await sb
    .from('perfis')
    .select('ilpi_id, papel, nome, ativo')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.ativo === false) return null
  return { user, ilpi_id: perfil.ilpi_id as string, papel: perfil.papel as string, nome: perfil.nome as string }
}
