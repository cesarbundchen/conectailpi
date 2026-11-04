'use client'
// Financeiro — mensalidades, pagamentos, inadimplência
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { usePapel } from '@/lib/usePapel'

type Fin = Record<string, any>
type F = Record<string, string>
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function FinanceiroPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [lista, setLista] = useState<Fin[]>([])
  const [residentes, setResidentes] = useState<Fin[]>([])
  const [load, setLoad] = useState(true)
  const [mNovo, setMNovo] = useState(false)
  const [mPag, setMPag] = useState<Fin | null>(null)
  const [form, setForm] = useState<F>({})
  const [pag, setPag] = useState<F>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const { gestor } = usePapel()

  const carregar = useCallback(async () => {
    setLoad(true)
    const [r1, r2] = await Promise.all([fetch(`/api/financeiro?mes=${mes}&ano=${ano}`), fetch('/api/residentes?status=Ativa')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados)
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  const brl = (v: number) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const inp = (k: string, f: F, set: (x: F) => void) => ({ value: f[k] ?? '', onChange: (e: React.ChangeEvent<any>) => set({ ...f, [k]: e.target.value }) })

  const totPrev = lista.reduce((s, f) => s + Number(f.mensalidade) + Number(f.extras ?? 0), 0)
  const totPago = lista.reduce((s, f) => s + Number(f.valor_pago ?? 0), 0)
  const inadimp = lista.filter(f => f.status === 'Atrasado').length

  async function lancar() {
    if (!form.residente_id || !form.mensalidade) { toast('Residente e mensalidade são obrigatórios', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/financeiro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, mes, ano, mensalidade: Number(form.mensalidade), extras: Number(form.extras ?? 0), status: 'Pendente' }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Lançamento criado', 'ok'); setMNovo(false); setForm({}); carregar() }
    else toast(j.erro?.includes('duplicate') ? 'Já existe lançamento para esta residente neste mês' : j.erro, 'erro')
  }

  async function registrarPag() {
    if (!mPag || !pag.valor_pago) { toast('Informe o valor pago', 'erro'); return }
    const prev = Number(mPag.mensalidade) + Number(mPag.extras ?? 0)
    const vp = Number(pag.valor_pago)
    setSalvando(true)
    const r = await fetch('/api/financeiro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: mPag.id, valor_pago: vp,
        data_pagamento: pag.data_pagamento || new Date().toISOString().split('T')[0],
        forma_pagamento: pag.forma_pagamento || 'PIX',
        status: vp >= prev ? 'Pago' : 'Parcial',
      }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Pagamento registrado', 'ok'); setMPag(null); setPag({}); carregar() }
    else toast(j.erro, 'erro')
  }

  async function marcarAtrasado(f: Fin) {
    const r = await fetch('/api/financeiro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, status: 'Atrasado' }) })
    const j = await r.json()
    if (j.ok) { toast('Marcado como atrasado', 'ok'); carregar() }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Financeiro</h1>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ width: 90, marginLeft: 'auto' }}>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ width: 90 }}>
          {[ano - 1, ano, ano + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {gestor && <button className="btn btn-p" onClick={() => { setForm({}); setMNovo(true) }}>+ Lançamento</button>}
      </div>

      <div className="mets">
        <div className="met"><div className="met-v" style={{ color: 'var(--azul)', fontSize: 20 }}>{brl(totPrev)}</div><div className="met-l">Previsto no mês</div></div>
        <div className="met"><div className="met-v" style={{ color: 'var(--verde)', fontSize: 20 }}>{brl(totPago)}</div><div className="met-l">Recebido</div></div>
        <div className="met"><div className="met-v" style={{ color: totPrev - totPago > 0 ? 'var(--amarelo)' : 'var(--verde)', fontSize: 20 }}>{brl(totPrev - totPago)}</div><div className="met-l">A receber</div></div>
        <div className="met"><div className="met-v" style={{ color: inadimp ? 'var(--vermelho)' : 'var(--verde)' }}>{inadimp}</div><div className="met-l">Inadimplentes</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {load ? <div className="empty">Carregando...</div> :
          lista.length === 0 ? <div className="empty">Nenhum lançamento em {MESES[mes - 1]}/{ano}</div> : (
            <table>
              <thead><tr><th>Residente</th><th>Mensalidade</th><th>Extras</th><th>Pago</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {lista.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.residentes?.nome}</td>
                    <td>{brl(f.mensalidade)}</td>
                    <td>{brl(f.extras)}{f.descricao_extras && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{f.descricao_extras}</div>}</td>
                    <td>{brl(f.valor_pago)}{f.data_pagamento && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{f.data_pagamento.split('-').reverse().join('/')}</div>}</td>
                    <td><Badge status={f.status} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {f.status !== 'Pago' && <>
                        {gestor && <button className="btn btn-s btn-sm" onClick={() => { setPag({ valor_pago: String(Number(f.mensalidade) + Number(f.extras ?? 0) - Number(f.valor_pago ?? 0)) }); setMPag(f) }}>$ Pagar</button>}{' '}
                        {gestor && f.status !== 'Atrasado' && <button className="btn btn-w btn-sm" onClick={() => marcarAtrasado(f)}>Atrasado</button>}
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <Modal aberto={mNovo} titulo={`Novo lançamento — ${MESES[mes - 1]}/${ano}`} onFechar={() => setMNovo(false)} larguraMax={520}>
        <div className="form-grid">
          <div className="full"><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id', form, setForm)}><option value="">Selecione...</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          </div>
          <div><label>Mensalidade (R$) <span className="req">*</span></label><input type="number" step="0.01" {...inp('mensalidade', form, setForm)} /></div>
          <div><label>Extras (R$)</label><input type="number" step="0.01" {...inp('extras', form, setForm)} /></div>
          <div className="full"><label>Descrição dos extras</label><input {...inp('descricao_extras', form, setForm)} placeholder="Fraldas, medicamentos..." /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={lancar} disabled={salvando}>{salvando ? '...' : 'Lançar'}</button>
        </div>
      </Modal>

      <Modal aberto={!!mPag} titulo={`Registrar pagamento — ${mPag?.residentes?.nome ?? ''}`} onFechar={() => setMPag(null)} larguraMax={440}>
        <div className="form-grid">
          <div><label>Valor pago (R$) <span className="req">*</span></label><input type="number" step="0.01" {...inp('valor_pago', pag, setPag)} /></div>
          <div><label>Data</label><input type="date" {...inp('data_pagamento', pag, setPag)} /></div>
          <div className="full"><label>Forma de pagamento</label>
            <select {...inp('forma_pagamento', pag, setPag)}><option>PIX</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option><option>Boleto</option></select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMPag(null)}>Cancelar</button>
          <button className="btn btn-s" onClick={registrarPag} disabled={salvando}>{salvando ? '...' : '✓ Confirmar'}</button>
        </div>
      </Modal>
    </div>
  )
}
