'use client'
// Barra superior — data de hoje, usuário, sair e (no celular) o botão do menu
import Icone from '@/components/ui/Icone'

export default function Topbar({ nomeUsuario, ilpiNome, onMenu }: {
  nomeUsuario: string; ilpiNome: string; onMenu: () => void
}) {
  const iniciais = nomeUsuario.trim().split(/\s+/)
    .map((p, i, a) => i === 0 || i === a.length - 1 ? p[0] : '')
    .join('').toUpperCase()
  const d = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hoje = d.charAt(0).toUpperCase() + d.slice(1)

  return (
    <header className="topbar">
      <button type="button" className="icon-btn topbar-menu" onClick={onMenu} aria-label="Abrir menu">
        <Icone nome="menu" tamanho={20} />
      </button>
      <div className="topbar-data" suppressHydrationWarning>{hoje}</div>
      <div className="topbar-user">
        <div className="topbar-nome">{nomeUsuario}<small>{ilpiNome}</small></div>
        <div className="av" style={{ width: 38, height: 38, fontSize: 13 }} aria-hidden="true">{iniciais}</div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="btn btn-sm" title="Sair do sistema">
            <Icone nome="sair" tamanho={15} /> Sair
          </button>
        </form>
      </div>
    </header>
  )
}
