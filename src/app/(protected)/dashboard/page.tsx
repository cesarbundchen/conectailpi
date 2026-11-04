// Dashboard — Server Component: dados carregados no servidor
import { getAuthenticatedUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { perfil, ilpi_id } = await getAuthenticatedUser()
  const sb = createServerSupabase()
  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const [residentes, ocorrencias, medicamentos, financeiro] = await Promise.all([
    sb.from('residentes').select('id,nome,status,quarto,grau_dependencia').eq('ilpi_id', ilpi_id).order('nome'),
    sb.from('ocorrencias').select('id,tipo_ocorrencia,status,data_hora').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('criado_em', { ascending: false }).limit(5),
    sb.from('medicamentos').select('id').eq('ilpi_id', ilpi_id).eq('status', 'Ativo').eq('arquivado', false),
    sb.from('financeiro').select('status').eq('ilpi_id', ilpi_id).eq('mes', mes).eq('ano', ano).eq('arquivado', false),
  ])

  const ativas = (residentes.data ?? []).filter(r => r.status === 'Ativa')
  const ocAb = (ocorrencias.data ?? []).filter(o => o.status === 'Aberta')
  const inadimp = (financeiro.data ?? []).filter(f => f.status === 'Atrasado').length

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Dashboard</h1>
      <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16 }}>Bem-vindo, {perfil.nome}.</p>

      <div className="mets">
        <div className="met"><div className="met-v" style={{ color: 'var(--azul)' }}>{ativas.length}</div><div className="met-l">Residentes ativas</div></div>
        <div className="met"><div className="met-v" style={{ color: ocAb.length ? 'var(--vermelho)' : 'var(--verde)' }}>{ocAb.length}</div><div className="met-l">Ocorrências abertas</div></div>
        <div className="met"><div className="met-v" style={{ color: 'var(--verde)' }}>{medicamentos.data?.length ?? 0}</div><div className="met-l">Medicamentos ativos</div></div>
        <div className="met"><div className="met-v" style={{ color: inadimp ? 'var(--amarelo)' : 'var(--verde)' }}>{inadimp}</div><div className="met-l">Inadimplentes no mês</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div className="card-title">Residentes ativas <Link href="/residentes" className="spacer" style={{ fontSize: 11, color: 'var(--azul)' }}>Ver todas →</Link></div>
          {ativas.length === 0 ? <div className="empty">Nenhuma residente cadastrada</div> :
            ativas.slice(0, 8).map(r => (
              <Link key={r.id} href={`/residentes/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1EFE8', textDecoration: 'none', color: 'inherit' }}>
                <div className="av" style={{ width: 28, height: 28, fontSize: 10 }}>{r.nome.split(' ').map((p: string, i: number, a: string[]) => i === 0 || i === a.length - 1 ? p[0] : '').join('').toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Q.{r.quarto} · {r.grau_dependencia ?? '—'}</div>
                </div>
                <Badge status={r.status} />
              </Link>
            ))}
        </div>
        <div className="card">
          <div className="card-title">Ocorrências recentes</div>
          {(ocorrencias.data ?? []).length === 0 ? <div className="empty">Nenhuma ocorrência</div> :
            (ocorrencias.data ?? []).map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{o.tipo_ocorrencia}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{new Date(o.data_hora).toLocaleString('pt-BR')}</div>
                </div>
                <Badge status={o.status} />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
