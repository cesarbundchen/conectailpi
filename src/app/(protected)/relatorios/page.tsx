'use client'
// Relatórios e dashboards personalizados — por instituição, residente ou colaboradora
// Escolha escopo + período → dashboard de indicadores + detalhamento → Imprimir/PDF
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

type D = Record<string, any>
const ESCOPOS = [
  { id: 'instituicao', icone: '🏥', nome: 'Instituição', desc: 'Visão geral de toda a ILPI' },
  { id: 'residente',   icone: '👤', nome: 'Residente',   desc: 'Dashboard individual de uma idosa' },
  { id: 'colaborador', icone: '🧑‍⚕️', nome: 'Colaboradora', desc: 'Produtividade de uma cuidadora/técnica' },
]

export default function RelatoriosPage() {
  const [escopo, setEscopo] = useState('instituicao')
  const [residentes, setResidentes] = useState<D[]>([])
  const [equipe, setEquipe] = useState<D[]>([])
  const [id, setId] = useState('')
  const hoje = new Date()
  const [de, setDe] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0])
  const [ate, setAte] = useState(hoje.toISOString().split('T')[0])
  const [dados, setDados] = useState<D | null>(null)
  const [load, setLoad] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/residentes').then(r => r.json()).then(j => { if (j.ok) setResidentes(j.dados) })
    fetch('/api/configuracoes').then(r => r.json()).then(j => { if (j.ok) setEquipe(j.dados.usuarios) })
  }, [])

  async function gerar() {
    if (escopo !== 'instituicao' && !id) { toast(escopo === 'residente' ? 'Escolha a residente' : 'Escolha a colaboradora', 'erro'); return }
    setLoad(true); setDados(null)
    const q = new URLSearchParams({ escopo, de, ate }); if (id) q.set('id', id)
    const r = await fetch(`/api/relatorios?${q}`)
    const j = await r.json(); setLoad(false)
    if (j.ok) setDados(j.dados); else toast(j.erro, 'erro')
  }

  const brl = (v: number) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const fdt = (d: string) => new Date(d).toLocaleDateString('pt-BR')
  const Met = ({ v, l, cor }: { v: React.ReactNode; l: string; cor?: string }) => (
    <div className="met"><div className="met-v" style={{ color: cor ?? 'var(--txt)', fontSize: typeof v === 'string' && v.length > 6 ? 17 : 24 }}>{v}</div><div className="met-l">{l}</div></div>
  )
  const T = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 7px' }}>{children}</div>
  const ind = dados?.indicadores ?? {}

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }} className="no-print">
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Relatórios e dashboards</h1>
        {dados && <button className="btn btn-p" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>🖨 Imprimir / Salvar PDF</button>}
      </div>

      {/* Construtor */}
      <div className="card no-print">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {ESCOPOS.map(e => (
            <button key={e.id} onClick={() => { setEscopo(e.id); setId(''); setDados(null) }}
              style={{ background: '#fff', border: escopo === e.id ? '2px solid var(--azul)' : '1px solid var(--brd)', borderRadius: 8, padding: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 18 }}>{e.icone}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{e.nome}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{e.desc}</div>
            </button>
          ))}
        </div>
        <div className="form-grid">
          {escopo === 'residente' && (
            <div><label>Residente</label>
              <select value={id} onChange={e => setId(e.target.value)}>
                <option value="">Escolha...</option>
                {residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
          )}
          {escopo === 'colaborador' && (
            <div><label>Colaboradora</label>
              <select value={id} onChange={e => setId(e.target.value)}>
                <option value="">Escolha...</option>
                {equipe.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.papel})</option>)}
              </select>
            </div>
          )}
          <div><label>De</label><input type="date" value={de} onChange={e => setDe(e.target.value)} /></div>
          <div><label>Até</label><input type="date" value={ate} onChange={e => setAte(e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={gerar} disabled={load}>
              {load ? 'Gerando...' : '📊 Gerar dashboard'}
            </button>
          </div>
        </div>
      </div>

      {/* ── RESULTADO ── */}
      {dados && (
        <div className="card" id="area-relatorio">
          <div style={{ borderBottom: '2px solid var(--azul)', paddingBottom: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--azul)' }}>
              🏥 ConectaILPI — {escopo === 'instituicao' ? 'Dashboard da Instituição' : escopo === 'residente' ? `Dashboard: ${dados.residente?.nome}` : `Produtividade: ${dados.colaborador?.nome}`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Período: {fdt(de)} a {fdt(ate)} · Gerado em {new Date().toLocaleString('pt-BR')} · LGPD — uso interno</div>
          </div>

          {/* INSTITUIÇÃO */}
          {escopo === 'instituicao' && (<>
            <div className="mets">
              <Met v={ind.residentes_ativas} l="Residentes ativas" cor="var(--azul)" />
              <Met v={ind.equipe_ativa} l="Equipe ativa" />
              <Met v={ind.adesao_medicacao != null ? ind.adesao_medicacao + '%' : '—'} l="Adesão à medicação" cor="var(--verde)" />
              <Met v={ind.ocorrencias_abertas} l="Ocorrências abertas" cor={ind.ocorrencias_abertas ? 'var(--vermelho)' : 'var(--verde)'} />
            </div>
            <div className="mets">
              <Met v={brl(ind.receita_prevista)} l="Receita prevista" />
              <Met v={brl(ind.receita_recebida)} l="Receita recebida" cor="var(--verde)" />
              <Met v={ind.inadimplentes} l="Inadimplentes" cor={ind.inadimplentes ? 'var(--amarelo)' : 'var(--verde)'} />
              <Met v={`${ind.medicamentos_ativos} (${ind.controlados}⚠)`} l="Medicamentos (controlados)" />
            </div>
            {Object.keys(dados.ocorrencias_por_tipo ?? {}).length > 0 && (<>
              <T>Ocorrências por tipo no período</T>
              {Object.entries(dados.ocorrencias_por_tipo as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([t, n]) => {
                const max = Math.max(...Object.values(dados.ocorrencias_por_tipo as Record<string, number>))
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                    <span style={{ width: 180, fontSize: 11 }}>{t}</span>
                    <div style={{ flex: 1, background: 'var(--brd-soft)', borderRadius: 4, height: 14 }}>
                      <div style={{ width: `${(n / max) * 100}%`, background: 'var(--azul)', height: 14, borderRadius: 4 }} />
                    </div>
                    <b style={{ fontSize: 11, width: 20 }}>{n}</b>
                  </div>
                )
              })}
            </>)}
            <T>Residentes</T>
            <table><thead><tr><th>Nome</th><th>Quarto</th><th>Dependência</th><th>Status</th></tr></thead>
              <tbody>{(dados.residentes ?? []).map((r: D) => (
                <tr key={r.id}><td>{r.nome}</td><td>Q.{r.quarto ?? '—'}</td><td style={{ fontSize: 10 }}>{r.grau_dependencia ?? '—'}</td><td>{r.status}</td></tr>
              ))}</tbody></table>
          </>)}

          {/* RESIDENTE */}
          {escopo === 'residente' && (<>
            <div className="mets">
              <Met v={ind.medicamentos_ativos} l="Medicamentos ativos" cor="var(--azul)" />
              <Met v={ind.adesao_medicacao != null ? ind.adesao_medicacao + '%' : '—'} l="Adesão à medicação" cor="var(--verde)" />
              <Met v={ind.recusas} l="Recusas no período" cor={ind.recusas ? 'var(--amarelo)' : 'var(--verde)'} />
              <Met v={ind.restricoes_ativas} l="Restrições ativas" cor={ind.restricoes_ativas ? 'var(--vermelho)' : 'var(--verde)'} />
            </div>
            <div className="mets">
              <Met v={ind.ocorrencias} l="Ocorrências no período" />
              <Met v={ind.ocorrencias_abertas} l="Em aberto" cor={ind.ocorrencias_abertas ? 'var(--vermelho)' : 'var(--verde)'} />
              <Met v={ind.atendimentos} l="Atendimentos" />
              <Met v={ind.administracoes} l="Doses registradas" />
            </div>
            {(dados.restricoes ?? []).length > 0 && (
              <div className="alert alert-d"><strong>⚠ Restrições:</strong> {(dados.restricoes ?? []).map((x: D) => `${x.tipo}: ${x.descricao}`).join(' · ')}</div>
            )}
            <T>Medicamentos</T>
            <table><thead><tr><th>Medicamento</th><th>Horários</th><th>Status</th></tr></thead>
              <tbody>{(dados.medicamentos ?? []).map((m: D) => (
                <tr key={m.id}><td>{m.nome_medicamento} {m.dosagem}{m.controlado ? ' ⚠️' : ''}</td><td>{(m.horarios ?? []).join(', ')}</td><td>{m.status}</td></tr>
              ))}</tbody></table>
            {(dados.ocorrencias ?? []).length > 0 && (<>
              <T>Ocorrências no período</T>
              <table><thead><tr><th>Data</th><th>Tipo</th><th>Status</th><th>Descrição</th></tr></thead>
                <tbody>{(dados.ocorrencias ?? []).map((o: D) => (
                  <tr key={o.id}><td>{fdt(o.data_hora)}</td><td>{o.tipo_ocorrencia}</td><td>{o.status}</td><td style={{ fontSize: 10 }}>{o.descricao}</td></tr>
                ))}</tbody></table>
            </>)}
            <T>Situação financeira (últimos meses)</T>
            <table><thead><tr><th>Mês</th><th>Valor</th><th>Pago</th><th>Status</th></tr></thead>
              <tbody>{(dados.financeiro ?? []).slice(0, 6).map((f: D) => (
                <tr key={f.id}><td>{String(f.mes).padStart(2, '0')}/{f.ano}</td><td>{brl(Number(f.mensalidade) + Number(f.extras ?? 0))}</td><td>{brl(f.valor_pago)}</td><td>{f.status}</td></tr>
              ))}</tbody></table>
          </>)}

          {/* COLABORADORA */}
          {escopo === 'colaborador' && (<>
            <div className="mets">
              <Met v={ind.administracoes} l="Doses administradas" cor="var(--azul)" />
              <Met v={ind.administradas_ok} l="Com sucesso" cor="var(--verde)" />
              <Met v={ind.ocorrencias_registradas} l="Ocorrências registradas" />
              <Met v={ind.ocorrencias_resolvidas} l="Ocorrências resolvidas" cor="var(--verde)" />
            </div>
            <div className="alert alert-i">
              Papel: <strong>{dados.colaborador?.papel}</strong> · Na equipe desde {fdt(dados.colaborador?.criado_em)} · {ind.total_acoes} ações registradas no período (todas auditadas).
            </div>
            {(dados.administracoes ?? []).length > 0 && (<>
              <T>Administrações de medicamentos</T>
              <table><thead><tr><th>Data</th><th>Residente</th><th>Horário</th><th>Resultado</th></tr></thead>
                <tbody>{(dados.administracoes ?? []).slice(0, 20).map((a: D) => (
                  <tr key={a.id}><td>{fdt(a.criado_em)}</td><td>{a.residentes?.nome}</td><td>{a.horario}</td><td>{a.status}</td></tr>
                ))}</tbody></table>
            </>)}
            {(dados.acoes ?? []).length > 0 && (<>
              <T>Últimas ações no sistema</T>
              {(dados.acoes ?? []).slice(0, 15).map((h: D, i: number) => (
                <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--brd-soft)' }}>
                  <b>{h.modulo}</b> · {h.acao} {h.residentes?.nome ? `· ${h.residentes.nome}` : ''}
                  <span style={{ color: 'var(--txt3)', float: 'right', fontSize: 10 }}>{new Date(h.criado_em).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </>)}
          </>)}
        </div>
      )}

      <style>{`@media print {
        .no-print, nav, header { display: none !important; }
        #area-relatorio { border: none !important; }
        body { background: #fff !important; }
      }`}</style>
    </div>
  )
}
