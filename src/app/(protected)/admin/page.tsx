// Painel do operador do SaaS — visível apenas para SUPER_ADMIN_EMAILS
// Server Component: verifica o e-mail no servidor, nunca no navegador
import { getAuthenticatedUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AdminAcoes from './AdminAcoes'

export const dynamic = 'force-dynamic'

function ehSuperAdmin(email?: string | null) {
  const lista = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return !!email && lista.includes(email.toLowerCase())
}

export default async function AdminPage() {
  const { user } = await getAuthenticatedUser()
  if (!ehSuperAdmin(user.email)) redirect('/dashboard')

  const admin = createAdminSupabase()
  const { data: ilpis } = await admin.from('ilpis')
    .select('id, nome, cnpj, plano, ativo, criado_em, email, telefone')
    .order('criado_em', { ascending: false })

  // Contagens por ILPI (residentes ativas e usuários)
  const [residentes, perfis] = await Promise.all([
    admin.from('residentes').select('ilpi_id, status'),
    admin.from('perfis').select('ilpi_id'),
  ])
  const contaRes = (id: string) => (residentes.data ?? []).filter(r => r.ilpi_id === id && r.status === 'Ativa').length
  const contaUsu = (id: string) => (perfis.data ?? []).filter(p => p.ilpi_id === id).length

  const lista = ilpis ?? []
  const ativas = lista.filter(i => i.ativo)
  const PRECO: Record<string, number> = { gratuito: 0, essencial: 97, completo: 197 }
  const mrr = ativas.reduce((s, i) => s + (PRECO[i.plano] ?? 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Painel do operador</h1>
        <span className="badge bg-aberta">Conecta ILPI — interno</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 16 }}>
        Visível apenas para os e-mails em SUPER_ADMIN_EMAILS. As ILPIs não veem esta página.
      </p>

      <div className="mets">
        <div className="met"><div className="met-v" style={{ color: 'var(--azul)' }}>{lista.length}</div><div className="met-l">ILPIs cadastradas</div></div>
        <div className="met"><div className="met-v" style={{ color: 'var(--verde)' }}>{ativas.length}</div><div className="met-l">Ativas</div></div>
        <div className="met"><div className="met-v" style={{ color: 'var(--verde)', fontSize: 20 }}>R$ {mrr.toLocaleString('pt-BR')}</div><div className="met-l">MRR estimado</div></div>
        <div className="met"><div className="met-v">{(residentes.data ?? []).filter(r => r.status === 'Ativa').length}</div><div className="met-l">Residentes na plataforma</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {lista.length === 0 ? <div className="empty">Nenhuma ILPI cadastrada ainda</div> : (
          <table>
            <thead><tr><th>ILPI</th><th>Plano</th><th>Residentes</th><th>Usuários</th><th>Desde</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {lista.map(i => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.nome}</strong>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{i.email ?? '—'} · {i.telefone ?? '—'}</div>
                  </td>
                  <td><span className={`badge ${i.plano === 'gratuito' ? 'bg-inativa' : 'bg-ativa'}`}>{i.plano}</span></td>
                  <td>{contaRes(i.id)}</td>
                  <td>{contaUsu(i.id)}</td>
                  <td style={{ fontSize: 11 }}>{new Date(i.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td>{i.ativo ? <span className="badge bg-ativa">Ativa</span> : <span className="badge bg-aberta">Suspensa</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    <AdminAcoes ilpi={{ id: i.id, nome: i.nome, plano: i.plano, ativo: i.ativo }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="alert alert-i" style={{ marginTop: 12 }}>
        <strong>Stripe:</strong> preparado e desativado. Quando houver clientes pagantes, descomente as chaves no
        ambiente e siga o STRIPE.md na raiz do projeto. Enquanto isso, altere planos manualmente aqui.
      </div>
    </div>
  )
}
