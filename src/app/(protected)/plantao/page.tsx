'use client'
// Passagem de plantão — kanban Pendente / Em observação / Concluída
// Resolve a perda de informação nos turnos 12x36 (gap dos concorrentes)
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

type D = Record<string, any>
const COLUNAS = ['Pendente', 'Em observação', 'Concluída'] as const

export default function PlantaoPage() {
  const [itens, setItens] = useState<D[]>([])
  const [passagens, setPassagens] = useState<D[]>([])
  const [residentes, setResidentes] = useState<D[]>([])
  const [mNovo, setMNovo] = useState(false)
  const [mFechar, setMFechar] = useState(false)
  const [form, setForm] = useState<D>({ prioridade: 'Normal' })
  const [turno, setTurno] = useState(new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'Diurno' : 'Noturno')
  const [resumo, setResumo] = useState('')
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    const [p, r] = await Promise.all([fetch('/api/plantao'), fetch('/api/residentes')])
    const jp = await p.json(); const jr = await r.json()
    if (jp.ok) { setItens(jp.dados.itens); setPassagens(jp.dados.passagens) }
    if (jr.ok) setResidentes(jr.dados)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function criar() {
    if (!form.titulo?.trim()) { toast('Título é obrigatório', 'erro'); return }
    const r = await fetch('/api/plantao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const j = await r.json()
    if (j.ok) { toast('Item adicionado ao quadro', 'ok'); setMNovo(false); setForm({ prioridade: 'Normal' }); carregar() }
    else toast(j.erro, 'erro')
  }
  async function mover(id: string, status: string) {
    const r = await fetch('/api/plantao', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    const j = await r.json()
    if (j.ok) carregar(); else toast(j.erro, 'erro')
  }
  async function fecharTurno() {
    if (!resumo.trim()) { toast('Escreva o resumo do turno', 'erro'); return }
    const r = await fetch('/api/plantao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'fechar_turno', turno, resumo }) })
    const j = await r.json()
    if (j.ok) { toast('Passagem de plantão registrada ✓', 'ok'); setMFechar(false); setResumo(''); carregar() }
    else toast(j.erro, 'erro')
  }

  const pend = itens.filter(i => i.status === 'Pendente')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Passagem de plantão</h1>
        <span className="spacer" />
        <button className="btn" onClick={() => setMNovo(true)}>+ Item no quadro</button>
        <button className="btn btn-p" onClick={() => setMFechar(true)}>Fechar meu turno →</button>
      </div>

      {pend.some(i => i.prioridade === 'Alta') && (
        <div className="alert alert-d"><strong>⚠ Atenção:</strong> há {pend.filter(i => i.prioridade === 'Alta').length} pendência(s) de prioridade ALTA no quadro.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'start' }}>
        {COLUNAS.map(col => {
          const lista = itens.filter(i => i.status === col)
          const cor = col === 'Pendente' ? 'var(--vermelho)' : col === 'Em observação' ? 'var(--amarelo)' : 'var(--verde)'
          return (
            <div key={col} style={{ background: '#F1EFE8', borderRadius: 10, padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: cor }} />
                {col} ({lista.length})
              </div>
              {lista.length === 0 && <div style={{ fontSize: 11, color: 'var(--txt3)', textAlign: 'center', padding: 10 }}>vazio</div>}
              {lista.map(i => (
                <div key={i.id} className="card" style={{ padding: '8px 10px', marginBottom: 6, borderLeft: i.prioridade === 'Alta' ? '3px solid var(--vermelho)' : undefined }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{i.titulo} {i.prioridade === 'Alta' && <span className="badge bg-aberta">Alta</span>}</div>
                  {i.residentes?.nome && <div style={{ fontSize: 10, color: 'var(--azul)', marginTop: 1 }}>👤 {i.residentes.nome}</div>}
                  {i.descricao && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 3 }}>{i.descricao}</div>}
                  <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                    {COLUNAS.filter(c => c !== col).map(c => (
                      <button key={c} className="btn btn-sm" onClick={() => mover(i.id, c)}>
                        → {c === 'Em observação' ? 'Observar' : c === 'Concluída' ? 'Concluir' : 'Reabrir'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title">📜 Últimas passagens de turno</div>
        {passagens.length === 0 ? <div className="empty">Nenhuma passagem registrada ainda</div> : passagens.map(p => (
          <div key={p.id} style={{ padding: '7px 0', borderBottom: '1px solid #F1EFE8' }}>
            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
              <span className={`badge ${p.turno === 'Diurno' ? 'bg-info' : 'bg-pendente'}`}>{p.turno}</span>
              <span style={{ color: 'var(--txt3)' }}>{new Date(p.criado_em).toLocaleString('pt-BR')}</span>
            </div>
            <div style={{ fontSize: 12, marginTop: 3, whiteSpace: 'pre-wrap' }}>{p.resumo}</div>
          </div>
        ))}
      </div>

      <Modal aberto={mNovo} titulo="Novo item no quadro" onFechar={() => setMNovo(false)} larguraMax={460}>
        <div className="form-grid">
          <div className="full"><label>Título <span className="req">*</span></label>
            <input value={form.titulo ?? ''} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Verificar curativo após o banho" /></div>
          <div><label>Residente (opcional)</label>
            <select value={form.residente_id ?? ''} onChange={e => setForm({ ...form, residente_id: e.target.value })}>
              <option value="">— Geral —</option>
              {residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select></div>
          <div><label>Prioridade</label>
            <select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })}>
              <option>Normal</option><option>Alta</option>
            </select></div>
          <div className="full"><label>Detalhes</label>
            <textarea rows={2} value={form.descricao ?? ''} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMNovo(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={criar}>Adicionar</button>
        </div>
      </Modal>

      <Modal aberto={mFechar} titulo="Fechar turno — passagem de plantão" onFechar={() => setMFechar(false)} larguraMax={520}>
        <div className="alert alert-i">O resumo abaixo + o quadro ao lado são o que a próxima equipe verá. Pendências abertas continuam no quadro.</div>
        <label>Turno</label>
        <select value={turno} onChange={e => setTurno(e.target.value)} style={{ marginBottom: 10 }}>
          <option>Diurno</option><option>Noturno</option>
        </select>
        <label>Resumo do turno <span className="req">*</span></label>
        <textarea rows={5} value={resumo} onChange={e => setResumo(e.target.value)}
          placeholder={"Ex.:\n- Todas medicadas nos horários\n- D. Francisca com sono agitado, reavaliar\n- Falta reposição de fraldas M"} />
        <div className="form-actions">
          <button className="btn" onClick={() => setMFechar(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={fecharTurno}>Registrar passagem</button>
        </div>
      </Modal>
    </div>
  )
}
