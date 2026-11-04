'use client'
// Documentos — cadastro com link (Storage nativo pode ser plugado depois)
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

type Doc = Record<string, any>
type F = Record<string, string>
const TIPOS = ['Contrato', 'RG/CPF', 'Cartão SUS', 'Laudo médico', 'Receituário', 'Procuração', 'Comprovante', 'Outro']

export default function DocumentosPage() {
  const [lista, setLista] = useState<Doc[]>([])
  const [residentes, setResidentes] = useState<Doc[]>([])
  const [load, setLoad] = useState(true)
  const [mNovo, setMNovo] = useState(false)
  const [form, setForm] = useState<F>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const [r1, r2] = await Promise.all([fetch('/api/documentos'), fetch('/api/residentes')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados)
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })

  async function salvar() {
    if (!form.residente_id || !form.tipo || !form.nome) { toast('Residente, tipo e nome são obrigatórios', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/documentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, visivel_portal: form.visivel_portal === 'sim', status: form.drive_url ? 'Ok' : 'Aguardando upload' }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Documento cadastrado', 'ok'); setMNovo(false); setForm({}); carregar() }
    else toast(j.erro, 'erro')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Documentos</h1>
        <button className="btn btn-p" style={{ marginLeft: 'auto' }} onClick={() => { setForm({}); setMNovo(true) }}>+ Cadastrar</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {load ? <div className="empty">Carregando...</div> :
          lista.length === 0 ? <div className="empty">Nenhum documento cadastrado</div> : (
            <table>
              <thead><tr><th>Documento</th><th>Residente</th><th>Tipo</th><th>Data</th><th>Status</th><th>Portal</th><th></th></tr></thead>
              <tbody>
                {lista.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.nome}</td>
                    <td>{d.residentes?.nome}</td>
                    <td style={{ fontSize: 11 }}>{d.tipo}</td>
                    <td style={{ fontSize: 11 }}>{d.data_documento ? d.data_documento.split('-').reverse().join('/') : '—'}</td>
                    <td><Badge status={d.status} /></td>
                    <td>{d.visivel_portal ? <span className="badge bg-info">Visível</span> : <span style={{ fontSize: 10, color: 'var(--txt3)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right' }}>{d.drive_url && <a href={d.drive_url} target="_blank" rel="noopener" className="btn btn-sm">Abrir ↗</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <Modal aberto={mNovo} titulo="Cadastrar documento" onFechar={() => setMNovo(false)} larguraMax={520}>
        <div className="form-grid">
          <div className="full"><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id')}><option value="">Selecione...</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          </div>
          <div><label>Tipo <span className="req">*</span></label>
            <select {...inp('tipo')}><option value="">Selecione...</option>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label>Data do documento</label><input type="date" {...inp('data_documento')} /></div>
          <div className="full"><label>Nome do documento <span className="req">*</span></label><input {...inp('nome')} placeholder="Contrato de prestação de serviços 2026" /></div>
          <div className="full"><label>Link do arquivo (Drive, OneDrive...)</label><input {...inp('drive_url')} placeholder="https://..." /></div>
          <div><label>Visível no portal da família?</label>
            <select {...inp('visivel_portal')}><option value="nao">Não</option><option value="sim">Sim</option></select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? '...' : 'Cadastrar'}</button>
        </div>
      </Modal>
    </div>
  )
}
