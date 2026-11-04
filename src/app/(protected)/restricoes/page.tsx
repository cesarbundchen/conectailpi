'use client'
// Restrições — alergias, restrições alimentares, mobilidade
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

type Rest = Record<string, any>
type F = Record<string, string>
const TIPOS = ['Alergia medicamentosa', 'Alergia alimentar', 'Restrição alimentar', 'Mobilidade', 'Comportamental', 'Outra']
const CORES: Record<string, string> = { Alta: 'var(--vermelho)', 'Média': 'var(--amarelo)', Baixa: 'var(--verde)' }

export default function RestricoesPage() {
  const [lista, setLista] = useState<Rest[]>([])
  const [residentes, setResidentes] = useState<Rest[]>([])
  const [load, setLoad] = useState(true)
  const [mNovo, setMNovo] = useState(false)
  const [form, setForm] = useState<F>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const [r1, r2] = await Promise.all([fetch('/api/restricoes?status=Ativa'), fetch('/api/residentes?status=Ativa')])
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    if (j1.ok) setLista(j1.dados)
    if (j2.ok) setResidentes(j2.dados)
    setLoad(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })

  async function salvar() {
    if (!form.residente_id || !form.tipo || !form.descricao) { toast('Preencha os campos obrigatórios', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/restricoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, gravidade: form.gravidade || 'Alta' }) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Restrição registrada', 'ok'); setMNovo(false); setForm({}); carregar() }
    else toast(j.erro, 'erro')
  }

  async function inativar(x: Rest) {
    const r = await fetch('/api/restricoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: x.id, status: 'Inativa', arquivado: true }) })
    const j = await r.json()
    if (j.ok) { toast('Restrição inativada', 'ok'); carregar() } else toast(j.erro, 'erro')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Restrições ativas</h1>
        <button className="btn btn-p" style={{ marginLeft: 'auto' }} onClick={() => { setForm({}); setMNovo(true) }}>+ Nova restrição</button>
      </div>

      {load ? <div className="empty">Carregando...</div> :
        lista.length === 0 ? <div className="card empty">Nenhuma restrição ativa</div> :
          lista.map(x => (
            <div key={x.id} className="card" style={{ borderLeft: `3px solid ${CORES[x.gravidade] ?? 'var(--brd)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{x.tipo}</strong>
                <span style={{ fontSize: 12, color: 'var(--txt2)' }}>· {x.residentes?.nome}</span>
                <Badge status={x.gravidade === 'Alta' ? 'Aberta' : x.gravidade === 'Média' ? 'Pendente' : 'Ativa'} />
                <span style={{ marginLeft: 'auto' }} />
                <button className="btn btn-sm" onClick={() => inativar(x)}>Inativar</button>
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{x.descricao}</div>
            </div>
          ))}

      <Modal aberto={mNovo} titulo="Nova restrição" onFechar={() => setMNovo(false)} larguraMax={520}>
        <div className="form-grid">
          <div className="full"><label>Residente <span className="req">*</span></label>
            <select {...inp('residente_id')}><option value="">Selecione...</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          </div>
          <div><label>Tipo <span className="req">*</span></label>
            <select {...inp('tipo')}><option value="">Selecione...</option>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label>Gravidade</label>
            <select {...inp('gravidade')}><option>Alta</option><option>Média</option><option>Baixa</option></select>
          </div>
          <div className="full"><label>Descrição <span className="req">*</span></label><textarea {...inp('descricao')} placeholder="Ex.: alergia grave a dipirona — risco de anafilaxia" /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? '...' : 'Registrar'}</button>
        </div>
      </Modal>
    </div>
  )
}
