'use client'
// Medicamentos — lista global, nova prescrição, administrar, suspender/arquivar
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

type Med = Record<string, any>
type F = Record<string, string>

export default function MedicamentosPage() {
  const [lista, setLista] = useState<Med[]>([])
  const [residentes, setResidentes] = useState<Med[]>([])
  const [status, setStatus] = useState('Ativo')
  const [load, setLoad] = useState(true)
  const [mNovo, setMNovo] = useState(false)
  const [mAdm, setMAdm] = useState<Med | null>(null)
  const [form, setForm] = useState<F>({})
  const [adm, setAdm] = useState<F>({ status: 'Administrado' })
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const q = status ? `?status=${status}` : ''
    const [r1, r2] = await Promise.all([fetch(`/api/medicamentos${q}`), fetch('/api/residentes?status=Ativa')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados); else toast('Erro ao carregar', 'erro')
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [status, toast])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string, f: F, set: (x: F) => void) =>
    ({ value: f[k] ?? '', onChange: (e: React.ChangeEvent<any>) => set({ ...f, [k]: e.target.value }) })

  async function salvarNovo() {
    if (!form.residente_id || !form.nome_medicamento) { toast('Residente e medicamento são obrigatórios', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/medicamentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, controlado: form.controlado === 'sim', horarios: form.horarios ? form.horarios.split(',').map(h => h.trim()) : [] }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Prescrição cadastrada', 'ok'); setMNovo(false); setForm({}); carregar() }
    else toast(j.erro, 'erro')
  }

  async function registrarAdm() {
    if (!mAdm || !adm.horario) { toast('Informe o horário', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/administracoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...adm, medicamento_id: mAdm.id, residente_id: mAdm.residente_id }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Administração registrada', 'ok'); setMAdm(null); setAdm({ status: 'Administrado' }) }
    else toast(j.erro, 'erro')
  }

  async function mudarStatus(m: Med, novo: string) {
    const body: Record<string, unknown> = { id: m.id, status: novo }
    if (novo === 'Arquivado') body.arquivado = true
    const r = await fetch('/api/medicamentos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    if (j.ok) { toast(`Medicamento ${novo.toLowerCase()}`, 'ok'); carregar() } else toast(j.erro, 'erro')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Medicamentos</h1>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 140, marginLeft: 'auto' }}>
          <option value="Ativo">Ativos</option><option value="Suspenso">Suspensos</option><option value="">Todos</option>
        </select>
        <button className="btn btn-p" onClick={() => { setForm({}); setMNovo(true) }}>+ Nova prescrição</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {load ? <div className="empty">Carregando...</div> :
          lista.length === 0 ? <div className="empty">Nenhum medicamento</div> : (
            <table>
              <thead><tr><th>Medicamento</th><th>Residente</th><th>Horários</th><th>Prescritor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {lista.map(m => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nome_medicamento}</strong> {m.dosagem}
                      {m.controlado && <span className="badge bg-aberta" style={{ marginLeft: 6 }}>Controlado</span>}
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{m.via} · {m.frequencia ?? '—'}</div>
                    </td>
                    <td>{m.residentes?.nome ?? '—'}</td>
                    <td>{(m.horarios ?? []).map((h: string) => <span key={h} className="badge bg-info" style={{ marginRight: 3 }}>{h}</span>)}</td>
                    <td style={{ fontSize: 11 }}>{m.medico_nome ?? '—'}</td>
                    <td><Badge status={m.status} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {m.status === 'Ativo' && <>
                        <button className="btn btn-s btn-sm" onClick={() => { setAdm({ status: 'Administrado', horario: new Date().toTimeString().slice(0, 5) }); setMAdm(m) }}>✓ Administrar</button>{' '}
                        <button className="btn btn-w btn-sm" onClick={() => mudarStatus(m, 'Suspenso')}>Suspender</button>
                      </>}
                      {m.status === 'Suspenso' && <>
                        <button className="btn btn-s btn-sm" onClick={() => mudarStatus(m, 'Ativo')}>Reativar</button>{' '}
                        <button className="btn btn-d btn-sm" onClick={() => mudarStatus(m, 'Arquivado')}>Arquivar</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Modal nova prescrição */}
      <Modal aberto={mNovo} titulo="Nova prescrição" onFechar={() => setMNovo(false)}>
        <div className="form-grid">
          <div className="full"><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id', form, setForm)}>
              <option value="">Selecione...</option>
              {residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <div className="full"><label>Medicamento <span className="req">*</span></label><input {...inp('nome_medicamento', form, setForm)} /></div>
          <div><label>Dosagem</label><input {...inp('dosagem', form, setForm)} placeholder="500mg" /></div>
          <div><label>Via</label>
            <select {...inp('via', form, setForm)}><option value="">—</option><option>Oral</option><option>Tópica</option><option>Injetável</option><option>Inalatória</option><option>Sublingual</option></select>
          </div>
          <div><label>Frequência</label><input {...inp('frequencia', form, setForm)} placeholder="12/12h" /></div>
          <div><label>Horários (vírgula)</label><input {...inp('horarios', form, setForm)} placeholder="08:00, 20:00" /></div>
          <div><label>Médico prescritor</label><input {...inp('medico_nome', form, setForm)} /></div>
          <div><label>CRM</label><input {...inp('medico_crm', form, setForm)} /></div>
          <div><label>Controlado?</label>
            <select {...inp('controlado', form, setForm)}><option value="nao">Não</option><option value="sim">Sim</option></select>
          </div>
          <div><label>Data início</label><input type="date" {...inp('data_inicio', form, setForm)} /></div>
          <div className="full"><label>Observações</label><textarea {...inp('observacoes', form, setForm)} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvarNovo} disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar'}</button>
        </div>
      </Modal>

      {/* Modal administrar */}
      <Modal aberto={!!mAdm} titulo={`Administrar — ${mAdm?.nome_medicamento ?? ''}`} onFechar={() => setMAdm(null)} larguraMax={440}>
        <div className="form-grid">
          <div><label>Horário <span className="req">*</span></label><input type="time" {...inp('horario', adm, setAdm)} /></div>
          <div><label>Resultado</label>
            <select {...inp('status', adm, setAdm)}>
              <option>Administrado</option><option>Recusado</option><option>Não encontrado</option><option>Adiado</option>
            </select>
          </div>
          <div className="full"><label>Observações</label><textarea {...inp('observacoes', adm, setAdm)} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMAdm(null)}>Cancelar</button>
          <button className="btn btn-s" onClick={registrarAdm} disabled={salvando}>{salvando ? '...' : '✓ Registrar'}</button>
        </div>
      </Modal>
    </div>
  )
}
