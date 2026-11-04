// Layout de todas as páginas autenticadas — sidebar + topbar + toast
// O middleware já bloqueou não-autenticados; aqui carregamos o perfil.
import { getAuthenticatedUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { ToastProvider } from '@/components/ui/Toast'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { perfil, user } = await getAuthenticatedUser()
  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const ehSuperAdmin = !!user.email && superAdmins.includes(user.email.toLowerCase())
  const ilpiNome: string = (perfil as { ilpis?: { nome?: string } }).ilpis?.nome ?? 'ConectaILPI'

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar ilpiNome={ilpiNome} superAdmin={ehSuperAdmin} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar nomeUsuario={perfil.nome} />
          <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
