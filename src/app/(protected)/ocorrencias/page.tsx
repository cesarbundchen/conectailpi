'use client'
// Ocorrências — registrar, monitorar, resolver
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

type Oc = Record<string, any>
type F = Record<string, string>
const TIPOS = ['Queda', 'Intercorrência clínica', 'Recusa de medicação', 'Recusa alimentar', 'Alteração comportamental', 'Lesão de pele', 'Fuga/evasão', 'Conflito', 'Outra']

export default function OcorrenciasPage() {
  const [lista, setLista] = useState<Oc[]>([])
  const [residentes, setResidentes] = useState<Oc[]>([])
  const [status, setStatus] = useState('')
  const [load, setLoad] = useState(true)
  const [mNovo, setMNovo] = useState(false)
  const [mRes, setMRes] = useState<Oc | null>(null)
  const [form, setForm] = useState<F>({})
  const [des, setDes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const q = status ? `?status=${status}` : ''
    const [r1, r2] = await Promise.all([fetch(`/api/ocorrencias${q}`), fetch('/api/residentes?status=Ativa')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados)
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [status])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })

  async function salvar() {
    if (!form.residente_id || !form.tipo_ocorrencia || !form.descricao) { toast('Residente, tipo e descrição são obrigatórios', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/ocorrencias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, familiar_notificado: form.familiar_notificado === 'sim', visivel_portal: form.visivel_portal !== 'nao' }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Ocorrência registrada', 'ok'); setMNovo(false); setForm({}); carregar() }
    else toast(j.erro, 'erro')
  }

  async function mudarStatus(o: Oc, novo: string, desfecho?: string) {
    const r = await fetch('/api/ocorrencias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: o.id, status: novo, ...(desfecho ? { desfecho } : {}) }),
    })
    const j = await r.json()
    if (j.ok) { toast(`Ocorrência ${novo.toLowerCase()}`, 'ok'); setMRes(null); setDes(''); carregar() }
    else toast(j.erro, 'erro')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ocorrências</h1>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150, marginLeft: 'auto' }}>
          <option value="">Todas</option><option>Aberta</option><option>Monitorando</option><option>Resolvida</option>
        </select>
        <button className="btn btn-p" onClick={() => { setForm({ data_hora: new Date().toISOString().slice(0, 16) }); setMNovo(true) }}>+ Registrar</button>
      </div>

      {load ? <div className="empty">Carregando...</div> :
        lista.length === 0 ? <div className="card empty">Nenhuma ocorrência</div> :
          lista.map(o => (
            <div key={o.id} className="card" style={{ borderLeft: `3px solid ${o.status === 'Aberta' ? 'var(--vermelho)' : o.status === 'Monitorando' ? 'var(--amarelo)' : 'var(--verde)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{o.tipo_ocorrencia}</strong>
                <span style={{ fontSize: 12, color: 'var(--txt2)' }}>· {o.residentes?.nome}</span>
                <Badge status={o.status} />
                <span style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 'auto' }}>{new Date(o.data_hora).toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 5 }}>{o.descricao}</div>
              {o.acao_imediata && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 3 }}><strong>Ação imediata:</strong> {o.acao_imediata}</div>}
              {o.desfecho && <div style={{ fontSize: 11, color: 'var(--verde)', marginTop: 3 }}><strong>Desfecho:</strong> {o.desfecho}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {o.familiar_notificado && <span className="badge bg-ativa">Família notificada</span>}
                {o.visivel_portal && <span className="badge bg-info">Visível no portal</span>}
                <span style={{ marginLeft: 'auto' }} />
                {o.status === 'Aberta' && <button className="btn btn-w btn-sm" onClick={() => mudarStatus(o, 'Monitorando')}>Monitorar</button>}
                {o.status !== 'Resolvida' && <button className="btn btn-s btn-sm" onClick={() => setMRes(o)}>✓ Resolver</button>}
              </div>
            </div>
          ))}

      {/* Modal registrar */}
      <Modal aberto={mNovo} titulo="Registrar ocorrência" onFechar={() => setMNovo(false)}>
        <div className="form-grid">
          <div><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id')}><option value="">Selecione...</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          </div>
          <div><label>Tipo <span className="req">*</span></label>
            <select {...inp('tipo_ocorrencia')}><option value="">Selecione...</option>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label>Data e hora</label><input type="datetime-local" {...inp('data_hora')} /></div>
          <div><label>Local</label><input {...inp('local')} placeholder="Quarto, refeitório..." /></div>
          <div className="full"><label>Descrição <span className="req">*</span></label><textarea {...inp('descricao')} /></div>
          <div className="full"><label>Ação imediata tomada</label><input {...inp('acao_imediata')} /></div>
          <div><label>Família notificada?</label>
            <select {...inp('familiar_notificado')}><option value="nao">Não</option><option value="sim">Sim</option></select>
          </div>
          <div><label>Visível no portal da família?</label>
            <select {...inp('visivel_portal')}><option value="sim">Sim</option><option value="nao">Não</option></select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? '...' : 'Registrar'}</button>
        </div>
      </Modal>

      {/* Modal resolver */}
      <Modal aberto={!!mRes} titulo="Resolver ocorrência" onFechar={() => setMRes(null)} larguraMax={440}>
        <label>Desfecho</label>
        <textarea value={des} onChange={e => setDes(e.target.value)} placeholder="Como a situação foi resolvida..." />
        <div className="form-actions">
          <button className="btn" onClick={() => setMRes(null)}>Cancelar</button>
          <button className="btn btn-s" onClick={() => mRes && mudarStatus(mRes, 'Resolvida', des)}>✓ Confirmar resolução</button>
        </div>
      </Modal>
    </div>
  )
}
