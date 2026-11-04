'use client'
// Responsáveis — cadastro e edição
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

type Resp = Record<string, any>
type F = Record<string, string>

export default function ResponsaveisPage() {
  const [lista, setLista] = useState<Resp[]>([])
  const [residentes, setResidentes] = useState<Resp[]>([])
  const [load, setLoad] = useState(true)
  const [mForm, setMForm] = useState(false)
  const [form, setForm] = useState<F>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const [r1, r2] = await Promise.all([fetch('/api/responsaveis'), fetch('/api/residentes')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados)
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })

  async function salvar() {
    if (!form.residente_id || !form.nome) { toast('Residente e nome são obrigatórios', 'erro'); return }
    setSalvando(true)
    const editando = !!form.id
    const r = await fetch('/api/responsaveis', {
      method: editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, autorizado_retirada: form.autorizado_retirada === 'sim' }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast(editando ? 'Atualizado' : 'Cadastrado', 'ok'); setMForm(false); setForm({}); carregar() }
    else toast(j.erro, 'erro')
  }

  function editar(x: Resp) {
    setForm({
      id: x.id, residente_id: x.residente_id, nome: x.nome ?? '', parentesco: x.parentesco ?? '',
      tipo: x.tipo ?? 'Familiar', telefone_principal: x.telefone_principal ?? '', email: x.email ?? '',
      autorizado_retirada: x.autorizado_retirada ? 'sim' : 'nao', cpf: x.cpf ?? '',
    })
    setMForm(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Responsáveis</h1>
        <button className="btn btn-p" style={{ marginLeft: 'auto' }} onClick={() => { setForm({}); setMForm(true) }}>+ Cadastrar</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {load ? <div className="empty">Carregando...</div> :
          lista.length === 0 ? <div className="empty">Nenhum responsável cadastrado</div> : (
            <table>
              <thead><tr><th>Nome</th><th>Residente</th><th>Parentesco</th><th>Tipo</th><th>Telefone</th><th>Retirada</th><th></th></tr></thead>
              <tbody>
                {lista.map(x => (
                  <tr key={x.id}>
                    <td style={{ fontWeight: 500 }}>{x.nome}</td>
                    <td>{x.residentes?.nome}</td>
                    <td style={{ fontSize: 11 }}>{x.parentesco ?? '—'}</td>
                    <td><span className="badge bg-info">{x.tipo ?? 'Familiar'}</span></td>
                    <td style={{ fontSize: 11 }}>{x.telefone_principal ?? '—'}</td>
                    <td>{x.autorizado_retirada ? <span className="badge bg-ativa">✓ Sim</span> : <span style={{ fontSize: 10, color: 'var(--txt3)' }}>Não</span>}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => editar(x)}>✏️ Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <Modal aberto={mForm} titulo={form.id ? 'Editar responsável' : 'Cadastrar responsável'} onFechar={() => setMForm(false)}>
        <div className="form-grid">
          <div className="full"><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id')} disabled={!!form.id}><option value="">Selecione...</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          </div>
          <div className="full"><label>Nome <span className="req">*</span></label><input {...inp('nome')} /></div>
          <div><label>CPF</label><input {...inp('cpf')} /></div>
          <div><label>Parentesco</label><input {...inp('parentesco')} /></div>
          <div><label>Tipo</label>
            <select {...inp('tipo')}><option>Familiar</option><option>Financeiro</option><option>Ambos</option></select>
          </div>
          <div><label>Telefone principal</label><input {...inp('telefone_principal')} /></div>
          <div><label>E-mail</label><input type="email" {...inp('email')} /></div>
          <div><label>Autorizado a retirar a residente?</label>
            <select {...inp('autorizado_retirada')}><option value="nao">Não</option><option value="sim">Sim</option></select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMForm(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? '...' : 'Salvar'}</button>
        </div>
      </Modal>
    </div>
  )
}
