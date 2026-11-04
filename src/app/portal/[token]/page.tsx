// Portal da família — acesso público via token único de 32 caracteres
// Usa o client ADMIN no servidor (nunca exposto ao navegador)
import { createAdminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function PortalPage({ params }: { params: { token: string } }) {
  const token = params.token
  if (!/^[a-f0-9]{32}$/.test(token)) return <Erro msg="Link inválido." />

  const sb = createAdminSupabase()
  const { data: r } = await sb.from('residentes')
    .select('id, nome, quarto, status, ilpi_id, ilpis(nome, telefone, email)')
    .eq('portal_token', token).single()

  if (!r) return <Erro msg="Link não encontrado. Confirme com a instituição." />

  const [meds, ocs, ats, fins, docs, resps] = await Promise.all([
    sb.from('medicamentos').select('nome_medicamento,dosagem,horarios,status').eq('residente_id', r.id).eq('status', 'Ativo').eq('arquivado', false),
    sb.from('ocorrencias').select('tipo_ocorrencia,data_hora,descricao,status,desfecho').eq('residente_id', r.id).eq('visivel_portal', true).eq('arquivado', false).order('data_hora', { ascending: false }).limit(10),
    sb.from('atendimentos').select('tipo_atendimento,data_hora,medico_nome,diagnostico').eq('residente_id', r.id).eq('arquivado', false).order('data_hora', { ascending: false }).limit(10),
    sb.from('financeiro').select('mes,ano,mensalidade,extras,valor_pago,status').eq('residente_id', r.id).eq('arquivado', false).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(6),
    sb.from('documentos').select('tipo,nome,drive_url,status').eq('residente_id', r.id).eq('visivel_portal', true).eq('arquivado', false),
    sb.from('responsaveis').select('nome,parentesco,telefone_principal').eq('residente_id', r.id).eq('arquivado', false),
  ])
  const restricoes = await sb.from('restricoes').select('tipo,descricao,gravidade').eq('residente_id', r.id).eq('status', 'Ativa').eq('arquivado', false)

  const brl = (v: number) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',')
  const ilpi = ((r as Record<string, unknown>).ilpis ?? {}) as { nome?: string; telefone?: string; email?: string }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 14px 40px' }}>
      <header style={{ background: 'var(--azul)', color: '#fff', margin: '0 -14px', padding: '22px 18px', borderRadius: '0 0 14px 14px' }}>
        <div style={{ fontSize: 11, opacity: .8 }}>🏥 {ilpi.nome ?? 'ConectaILPI'} — Portal da Família</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{r.nome}</div>
        <div style={{ fontSize: 12, opacity: .85 }}>Quarto {r.quarto ?? '—'} · Situação: {r.status}</div>
      </header>

      {(restricoes.data ?? []).length > 0 && (
        <div className="alert alert-d" style={{ marginTop: 14 }}>
          <strong>⚠ Cuidados especiais:</strong> {(restricoes.data ?? []).map(x => `${x.tipo}: ${x.descricao}`).join(' · ')}
        </div>
      )}

      <Sec titulo="💊 Medicamentos em uso">
        {(meds.data ?? []).length === 0 ? <Vazio /> : (meds.data ?? []).map((m, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #F1EFE8' }}>
            <strong style={{ fontSize: 13 }}>{m.nome_medicamento} {m.dosagem}</strong>
            <div style={{ marginTop: 3 }}>{(m.horarios ?? []).map((h: string) => <span key={h} className="badge bg-info" style={{ marginRight: 4 }}>{h}</span>)}</div>
          </div>
        ))}
      </Sec>

      <Sec titulo="📋 Últimas atualizações">
        {(ocs.data ?? []).length === 0 ? <Vazio /> : (ocs.data ?? []).map((o, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #F1EFE8' }}>
            <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <strong>{o.tipo_ocorrencia}</strong>
              <span style={{ marginLeft: 'auto', color: 'var(--txt3)', fontSize: 11 }}>{new Date(o.data_hora).toLocaleDateString('pt-BR')}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{o.descricao}</div>
            {o.desfecho && <div style={{ fontSize: 11, color: 'var(--verde)' }}>✓ {o.desfecho}</div>}
          </div>
        ))}
      </Sec>

      <Sec titulo="🩺 Atendimentos recentes">
        {(ats.data ?? []).length === 0 ? <Vazio /> : (ats.data ?? []).map((a, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #F1EFE8', fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <strong>{a.tipo_atendimento}</strong>
              <span style={{ marginLeft: 'auto', color: 'var(--txt3)', fontSize: 11 }}>{new Date(a.data_hora).toLocaleDateString('pt-BR')}</span>
            </div>
            {a.medico_nome && <div style={{ color: 'var(--txt2)', fontSize: 11 }}>Dr(a). {a.medico_nome}</div>}
          </div>
        ))}
      </Sec>

      <Sec titulo="💰 Mensalidades">
        {(fins.data ?? []).length === 0 ? <Vazio /> : (
          <table>
            <thead><tr><th>Mês</th><th>Valor</th><th>Pago</th><th>Situação</th></tr></thead>
            <tbody>{(fins.data ?? []).map((f, i) => (
              <tr key={i}>
                <td>{String(f.mes).padStart(2, '0')}/{f.ano}</td>
                <td>{brl(Number(f.mensalidade) + Number(f.extras ?? 0))}</td>
                <td>{brl(f.valor_pago)}</td>
                <td><span className={`badge ${f.status === 'Pago' ? 'bg-ativa' : f.status === 'Atrasado' ? 'bg-aberta' : 'bg-pendente'}`}>{f.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Sec>

      <Sec titulo="📂 Documentos disponíveis">
        {(docs.data ?? []).length === 0 ? <Vazio /> : (docs.data ?? []).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #F1EFE8', fontSize: 12 }}>
            <span>{d.nome}</span>
            {d.drive_url && <a href={d.drive_url} target="_blank" rel="noopener" className="btn btn-sm" style={{ marginLeft: 'auto' }}>Abrir ↗</a>}
          </div>
        ))}
      </Sec>

      <Sec titulo="📞 Contato da instituição">
        <div style={{ fontSize: 13 }}>
          <div><strong>{ilpi.nome ?? '—'}</strong></div>
          {ilpi.telefone && <div style={{ marginTop: 4 }}>Telefone: {ilpi.telefone}</div>}
          {ilpi.email && <div>E-mail: {ilpi.email}</div>}
        </div>
      </Sec>

      <footer style={{ fontSize: 10, color: 'var(--txt3)', textAlign: 'center', marginTop: 24 }}>
        Acesso restrito à família · Dados protegidos pela LGPD · ConectaILPI © 2026
      </footer>
    </div>
  )
}

function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div className="card" style={{ marginTop: 12 }}><div className="card-title">{titulo}</div>{children}</div>
}
function Vazio() { return <div style={{ fontSize: 12, color: 'var(--txt3)', padding: '4px 0' }}>Nenhum registro no momento.</div> }
function Erro({ msg }: { msg: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, textAlign: 'center', padding: 30 }}>
        <div style={{ fontSize: 30 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{msg}</div>
      </div>
    </div>
  )
}
