'use client'
// Dietas individualizadas — prescrição + mapa imprimível para a cozinha
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { usePapel } from '@/lib/usePapel'

type D = Record<string, any>
const TIPOS = ['Geral', 'Branda', 'Pastosa', 'Líquida', 'Enteral']
const COR: Record<string, string> = { Geral: 'bg-ativa', Branda: 'bg-info', Pastosa: 'bg-pendente', 'Líquida': 'bg-pendente', Enteral: 'bg-aberta' }

export default function DietasPage() {
  const [dietas, setDietas] = useState<D[]>([])
  const [residentes, setResidentes] = useState<D[]>([])
  const [modal, setModal] = useState<D | null>(null)
  const [form, setForm] = useState<D>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const { clinico } = usePapel()

  const carregar = useCallback(async () => {
    const r = await fetch('/api/dietas'); const j = await r.json()
    if (j.ok) { setDietas(j.dados.dietas); setResidentes(j.dados.residentes) } else toast(j.erro, 'erro')
  }, [toast])
  useEffect(() => { carregar() }, [carregar])

  const dietaDe = (rid: string) => dietas.find(d => d.residente_id === rid)

  function abrir(r: D) {
    const d = dietaDe(r.id)
    setForm(d ? { tipo_dieta: d.tipo_dieta, restricoes: d.restricoes ?? '', suplementos: d.suplementos ?? '', observacoes: d.observacoes ?? '', prescrito_por: d.prescrito_por ?? '' } : { tipo_dieta: 'Geral' })
    setModal(r)
  }

  async function salvar() {
    setSalvando(true)
    const r = await fetch('/api/dietas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, residente_id: modal!.id }) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Dieta prescrita ✓', 'ok'); setModal(null); carregar() } else toast(j.erro, 'erro')
  }

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })
  const resumo = TIPOS.map(t => ({ t, n: dietas.filter(d => d.tipo_dieta === t).length })).filter(x => x.n > 0)

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Dietas individualizadas</h1>
        <span className="spacer" />
        <button className="btn btn-p" onClick={() => window.print()}>🖨 Imprimir mapa da cozinha</button>
      </div>

      <div id="mapa-dietas" className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '2px solid var(--azul)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>🍽 Mapa de Dietas — {new Date().toLocaleDateString('pt-BR')}</div>
          <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>
            {resumo.length ? resumo.map(x => `${x.t}: ${x.n}`).join(' · ') : 'Nenhuma dieta prescrita ainda'} · Total de residentes ativas: {residentes.length}
          </div>
        </div>
        <table>
          <thead><tr><th>Residente</th><th>Quarto</th><th>Dieta</th><th>Restrições</th><th>Suplementos</th><th className="no-print"></th></tr></thead>
          <tbody>
            {residentes.map(r => {
              const d = dietaDe(r.id)
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.nome}</td>
                  <td>Q.{r.quarto ?? '—'}</td>
                  <td>{d ? <span className={`badge ${COR[d.tipo_dieta]}`}>{d.tipo_dieta}</span> : <span className="badge bg-inativa">Sem prescrição</span>}</td>
                  <td style={{ fontSize: 11, color: d?.restricoes ? 'var(--vermelho)' : 'var(--txt3)' }}>{d?.restricoes || '—'}</td>
                  <td style={{ fontSize: 11 }}>{d?.suplementos || '—'}</td>
                  <td className="no-print" style={{ textAlign: 'right' }}>
                    {clinico && <button className="btn btn-sm" onClick={() => abrir(r)}>{d ? 'Alterar' : '+ Prescrever'}</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="alert alert-i no-print" style={{ marginTop: 10 }}>
        Cada residente tem <strong>uma dieta ativa</strong> — prescrever nova inativa a anterior (histórico preservado e auditado). Alergias alimentares graves também devem ser cadastradas em <strong>Restrições</strong> para aparecerem em alerta no prontuário.
      </div>

      <Modal aberto={!!modal} titulo={`Prescrever dieta — ${modal?.nome ?? ''}`} onFechar={() => setModal(null)} larguraMax={480}>
        <div className="form-grid">
          <div><label>Tipo de dieta <span className="req">*</span></label>
            <select {...inp('tipo_dieta')}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label>Prescrito por</label><input {...inp('prescrito_por')} placeholder="Nutricionista/médico" /></div>
          <div className="full"><label>Restrições (sal, açúcar, alergias...)</label><input {...inp('restricoes')} placeholder="Ex.: hipossódica; sem lactose" /></div>
          <div className="full"><label>Suplementos</label><input {...inp('suplementos')} placeholder="Ex.: suplemento proteico no lanche" /></div>
          <div className="full"><label>Observações para a cozinha</label><textarea rows={2} {...inp('observacoes')} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? '...' : 'Salvar prescrição'}</button>
        </div>
      </Modal>

      <style>{`@media print { .no-print, nav, header { display:none !important } #mapa-dietas { border:none !important } body { background:#fff !important } }`}</style>
    </div>
  )
}
