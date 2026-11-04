'use client'
// Atendimentos médicos — registro com CID-10
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

type At = Record<string, any>
type F = Record<string, string>
const TIPOS = ['Consulta médica', 'Consulta de enfermagem', 'Fisioterapia', 'Nutrição', 'Psicologia', 'Odontologia', 'Emergência', 'Retorno', 'Outro']

export default function AtendimentosPage() {
  const [lista, setLista] = useState<At[]>([])
  const [residentes, setResidentes] = useState<At[]>([])
  const [load, setLoad] = useState(true)
  const [mNovo, setMNovo] = useState(false)
  const [form, setForm] = useState<F>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const [r1, r2] = await Promise.all([fetch('/api/atendimentos'), fetch('/api/residentes?status=Ativa')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados)
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })

  async function salvar() {
    if (!form.residente_id || !form.tipo_atendimento) { toast('Residente e tipo são obrigatórios', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/atendimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Atendimento registrado', 'ok'); setMNovo(false); setForm({}); carregar() }
    else toast(j.erro, 'erro')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Atendimentos</h1>
        <button className="btn btn-p" style={{ marginLeft: 'auto' }} onClick={() => { setForm({ data_hora: new Date().toISOString().slice(0, 16) }); setMNovo(true) }}>+ Registrar</button>
      </div>

      {load ? <div className="empty">Carregando...</div> :
        lista.length === 0 ? <div className="card empty">Nenhum atendimento registrado</div> :
          lista.map(a => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{a.tipo_atendimento}</strong>
                <span style={{ fontSize: 12, color: 'var(--txt2)' }}>· {a.residentes?.nome}</span>
                {a.cid10 && <span className="badge bg-info">CID {a.cid10}</span>}
                <span style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 'auto' }}>{new Date(a.data_hora).toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 3 }}>
                {a.medico_nome && `Dr(a). ${a.medico_nome}`} {a.medico_crm && `· CRM ${a.medico_crm}`}
              </div>
              {a.queixas && <div style={{ fontSize: 12, marginTop: 4 }}><strong>Queixas:</strong> {a.queixas}</div>}
              {a.diagnostico && <div style={{ fontSize: 12, marginTop: 2 }}><strong>Diagnóstico:</strong> {a.diagnostico}</div>}
              {a.conduta && <div style={{ fontSize: 12, marginTop: 2 }}><strong>Conduta:</strong> {a.conduta}</div>}
              {a.retorno && <div style={{ fontSize: 11, color: 'var(--azul)', marginTop: 3 }}>Retorno: {a.retorno.split('-').reverse().join('/')}</div>}
            </div>
          ))}

      <Modal aberto={mNovo} titulo="Registrar atendimento" onFechar={() => setMNovo(false)}>
        <div className="form-grid">
          <div><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id')}><option value="">Selecione...</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          </div>
          <div><label>Tipo <span className="req">*</span></label>
            <select {...inp('tipo_atendimento')}><option value="">Selecione...</option>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label>Data e hora</label><input type="datetime-local" {...inp('data_hora')} /></div>
          <div><label>Profissional</label><input {...inp('medico_nome')} /></div>
          <div><label>CRM / registro</label><input {...inp('medico_crm')} /></div>
          <div><label>CID-10</label><input {...inp('cid10')} placeholder="I10" /></div>
          <div className="full"><label>Queixas</label><textarea {...inp('queixas')} /></div>
          <div className="full"><label>Diagnóstico</label><input {...inp('diagnostico')} /></div>
          <div className="full"><label>Conduta / prescrições</label><textarea {...inp('conduta')} /></div>
          <div><label>Data de retorno</label><input type="date" {...inp('retorno')} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? '...' : 'Registrar'}</button>
        </div>
      </Modal>
    </div>
  )
}
