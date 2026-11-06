'use client'
// Menu lateral — presente em todas as páginas autenticadas
// Em telas pequenas vira gaveta (aberta pelo botão de menu da barra superior)
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icone, { type NomeIcone } from '@/components/ui/Icone'

type Item = { href: string; icone: NomeIcone; label: string }

const MENU: { grupo: string; itens: Item[] }[] = [
  { grupo: 'Principal', itens: [
    { href: '/dashboard',   icone: 'painel',      label: 'Painel' },
    { href: '/residentes',  icone: 'residentes',  label: 'Residentes' },
    { href: '/admissao',    icone: 'admissao',    label: 'Nova admissão' },
  ]},
  { grupo: 'Cuidado', itens: [
    { href: '/registro',     icone: 'registro',     label: 'Registro de cuidados' },
    { href: '/medicamentos', icone: 'medicamentos', label: 'Medicamentos' },
    { href: '/ocorrencias',  icone: 'ocorrencias',  label: 'Ocorrências' },
    { href: '/atendimentos', icone: 'atendimentos', label: 'Atendimentos' },
    { href: '/restricoes',   icone: 'restricoes',   label: 'Restrições' },
    { href: '/plantao',      icone: 'plantao',      label: 'Plantão' },
    { href: '/cuidados',     icone: 'cuidados',     label: 'Cuidados diários' },
    { href: '/dietas',       icone: 'dietas',       label: 'Dietas' },
    { href: '/avaliacoes',   icone: 'avaliacoes',   label: 'Avaliações' },
  ]},
  { grupo: 'Gestão', itens: [
    { href: '/financeiro',   icone: 'financeiro',   label: 'Financeiro' },
    { href: '/documentos',   icone: 'documentos',   label: 'Documentos' },
    { href: '/responsaveis', icone: 'responsaveis', label: 'Responsáveis' },
    { href: '/historico',    icone: 'historico',    label: 'Histórico' },
    { href: '/relatorios',   icone: 'relatorios',   label: 'Relatórios' },
    { href: '/dados',        icone: 'dados',        label: 'Importar/Exportar' },
  ]},
  { grupo: 'Sistema', itens: [
    { href: '/perfis',        icone: 'perfis',        label: 'Perfis de acesso' },
    { href: '/configuracoes', icone: 'configuracoes', label: 'Configurações' },
  ]},
]

export default function Sidebar({ ilpiNome, superAdmin = false, onNavegar }: {
  ilpiNome: string; superAdmin?: boolean; onNavegar?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="sidebar" aria-label="Menu principal">
      <div className="sidebar-head">
        <img src="/logo-escuro.png" alt="ConectaILPI" className="sidebar-logo" />
        <div className="sidebar-ilpi" title={ilpiNome}>
          <Icone nome="casa" tamanho={16} style={{ color: '#8FD9D2', flexShrink: 0 }} />
          <span>{ilpiNome}</span>
        </div>
      </div>

      {MENU.map(g => (
        <div key={g.grupo}>
          <div className="sidebar-grupo">{g.grupo}</div>
          {g.itens.map(item => {
            const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} onClick={onNavegar}
                className={`sidebar-link${ativo ? ' on' : ''}`} aria-current={ativo ? 'page' : undefined}>
                <Icone nome={item.icone} />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}

      {superAdmin && (
        <>
          <div className="sidebar-grupo">Plataforma</div>
          <Link href="/admin" onClick={onNavegar}
            className={`sidebar-link admin${pathname.startsWith('/admin') ? ' on' : ''}`}>
            <Icone nome="admin" />
            Painel do operador
          </Link>
        </>
      )}

      <div className="sidebar-foot"><i aria-hidden="true" /> ConectaILPI · v3.0</div>
    </nav>
  )
}
