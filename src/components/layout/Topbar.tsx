// Barra superior — nome do usuário + logout
export default function Topbar({ nomeUsuario }: { nomeUsuario: string }) {
  const iniciais = nomeUsuario.trim().split(' ')
    .map((p, i, a) => i === 0 || i === a.length - 1 ? p[0] : '')
    .join('').toUpperCase()

  return (
    <header style={{
      background: '#fff', borderBottom: '1px solid #E0DDD6', padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ fontSize: 13, color: '#6B6A65', marginLeft: 'auto' }}>{nomeUsuario}</div>
      <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{iniciais}</div>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="btn btn-sm">Sair</button>
      </form>
    </header>
  )
}
