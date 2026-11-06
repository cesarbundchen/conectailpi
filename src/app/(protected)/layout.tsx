// Layout de todas as páginas autenticadas — menu lateral + barra superior + toast
// O middleware já bloqueou não-autenticados; aqui carregamos o perfil.
import { getAuthenticatedUser } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { perfil, user } = await getAuthenticatedUser()
  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const ehSuperAdmin = !!user.email && superAdmins.includes(user.email.toLowerCase())
  const ilpiNome: string = (perfil as { ilpis?: { nome?: string } }).ilpis?.nome ?? 'ConectaILPI'

  return (
    <ToastProvider>
      <AppShell ilpiNome={ilpiNome} superAdmin={ehSuperAdmin} nomeUsuario={perfil.nome}>
        {children}
      </AppShell>
    </ToastProvider>
  )
}
