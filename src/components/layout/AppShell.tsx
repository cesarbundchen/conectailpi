'use client'
// Estrutura das páginas autenticadas: menu lateral + barra superior + conteúdo
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ ilpiNome, superAdmin, nomeUsuario, children }: {
  ilpiNome: string; superAdmin: boolean; nomeUsuario: string; children: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setAberto(false) }, [pathname])
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto])

  return (
    <div className={`app${aberto ? ' menu-aberto' : ''}`}>
      <Sidebar ilpiNome={ilpiNome} superAdmin={superAdmin} onNavegar={() => setAberto(false)} />
      <div className="scrim" onClick={() => setAberto(false)} aria-hidden="true" />
      <div className="app-main-col">
        <Topbar nomeUsuario={nomeUsuario} ilpiNome={ilpiNome} onMenu={() => setAberto(true)} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
