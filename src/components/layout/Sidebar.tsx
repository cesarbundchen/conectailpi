'use client'
// Menu lateral — presente em todas as páginas autenticadas
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MENU = [
  { grupo: 'Principal', itens: [
    { href: '/dashboard',   icone: '📊', label: 'Dashboard' },
    { href: '/residentes',  icone: '👥', label: 'Residentes' },
    { href: '/admissao',    icone: '📋', label: 'Nova admissão' },
  ]},
  { grupo: 'Cuidado', itens: [
    { href: '/registro', icone: '📝', label: 'Registro de cuidados' },
    { href: '/medicamentos', icone: '💊', label: 'Medicamentos' },
    { href: '/ocorrencias',  icone: '⚠️', label: 'Ocorrências' },
    { href: '/atendimentos', icone: '🩺', label: 'Atendimentos' },
    { href: '/restricoes',   icone: '🚫', label: 'Restrições' },
    { href: '/plantao',      icone: '🗂️', label: 'Plantão' },
    { href: '/cuidados',     icone: '💧', label: 'Cuidados diários' },
    { href: '/dietas',       icone: '🍽️', label: 'Dietas' },
    { href: '/avaliacoes',   icone: '📐', label: 'Avaliações' },
  ]},
  { grupo: 'Gestão', itens: [
    { href: '/financeiro',   icone: '💰', label: 'Financeiro' },
    { href: '/documentos',   icone: '📂', label: 'Documentos' },
    { href: '/responsaveis', icone: '👤', label: 'Responsáveis' },
    { href: '/historico',    icone: '📜', label: 'Histórico' },
    { href: '/relatorios',   icone: '📈', label: 'Relatórios' },
    { href: '/dados',        icone: '🔄', label: 'Importar/Exportar' },
  ]},
  { grupo: 'Sistema', itens: [
    { href: '/perfis',        icone: '🔐', label: 'Perfis de acesso' },
    { href: '/configuracoes', icone: '⚙️', label: 'Configurações' },
  ]},
]

// Todos os módulos implementados (Sprints 1, 2 e 3 concluídos)
const PENDENTES: string[] = []

export default function Sidebar({ ilpiNome, superAdmin = false }: { ilpiNome: string; superAdmin?: boolean }) {
  const pathname = usePathname()

  return (
    <nav style={{
      width: 210, flexShrink: 0, background: '#fff', borderRight: '1px solid #E0DDD6',
      display: 'flex', flexDirection: 'column', overflowY: 'auto', height: '100vh',
      position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #E0DDD6' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#185FA5' }}>🏥 ConectaILPI</div>
        <div style={{ fontSize: 10, color: '#9C9B96', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ilpiNome}
        </div>
      </div>

      {MENU.map(g => (
        <div key={g.grupo}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#9C9B96', letterSpacing: '.06em',
            textTransform: 'uppercase', padding: '14px 16px 4px',
          }}>{g.grupo}</div>
          {g.itens.map(item => {
            const ativo = pathname.startsWith(item.href)
            const pendente = PENDENTES.includes(item.href)
            return (
              <Link key={item.href} href={pendente ? '#' : item.href}
                onClick={pendente ? e => e.preventDefault() : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  fontSize: 12, textDecoration: 'none',
                  color: pendente ? '#C7C5BC' : ativo ? '#0C447C' : '#6B6A65',
                  background: ativo ? '#E6F1FB' : 'transparent',
                  borderLeft: ativo ? '2px solid #185FA5' : '2px solid transparent',
                  fontWeight: ativo ? 600 : 400,
                  cursor: pendente ? 'default' : 'pointer',
                }}>
                <span style={{ fontSize: 14 }}>{item.icone}</span>
                {item.label}
                {pendente && <span style={{
                  marginLeft: 'auto', fontSize: 8, background: '#F1EFE8',
                  color: '#9C9B96', borderRadius: 99, padding: '1px 6px', fontWeight: 600,
                }}>em breve</span>}
              </Link>
            )
          })}
        </div>
      ))}

      {superAdmin && (
        <Link href="/admin" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 12,
          textDecoration: 'none', color: pathname.startsWith('/admin') ? '#0C447C' : '#A32D2D',
          background: pathname.startsWith('/admin') ? '#E6F1FB' : 'transparent',
          borderLeft: pathname.startsWith('/admin') ? '2px solid #185FA5' : '2px solid transparent',
          fontWeight: 600, marginTop: 8,
        }}>
          <span style={{ fontSize: 14 }}>🛠</span> Painel do operador
        </Link>
      )}

      <div style={{ marginTop: 'auto', padding: 12, fontSize: 9, color: '#C7C5BC', textAlign: 'center' }}>
        ConectaILPI · v2.1
      </div>
    </nav>
  )
}
