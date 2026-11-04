'use client'
// Cuidados diários — Mapa de hidratação + Rondas (gaps do benchmarking vs. Cuidare)
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

type D = Record<string, any>
const SITUACOES = ['Dormindo', 'Acordada tranquila', 'Agitada', 'Necessitou atendimento'] as const
const COR_SIT: Record<string, string> = { 'Dormindo': 'bg-info', 'Acordada tranquila': 'bg-ativa', 'Agitada': 'bg-pendente', 'Necessitou atendimento': 'bg-aberta' }

export default function CuidadosPage() {
  const [aba, setAba] = useState<'hidratacao' | 'rondas'>('hidratacao')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [hid, setHid] = useState<{ registros: D[]; residentes: D[] } | null>(null)
  const [ron, setRon] = useState<{ registros: D[]; residentes: D[] } | null>(null)
  const [obs, setObs] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    const [h, r] = await Promise.all([
      fetch(`/api/hidratacao?data=${data}`).then(x => x.json()),
      fetch(`/api/rondas?data=${data}`).then(x => x.json()),
    ])
    if (h.ok) setHid(h.dados)
    if (r.ok) setRon(r.dados)
  }, [data])
  useEffect(() => { carregar() }, [carregar])

  async function registrarAgua(residente_id: string, volume_ml: number) {
    const r = await fetch('/api/hidratacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ residente_id, volume_ml, data }) })
    const j = await r.json()
    if (j.ok) { toast(`+${volume_ml} ml registrados`, 'ok'); carregar() } else toast(j.erro, 'erro')
  }

  async function registrarRonda(residente_id: string, situacao: string) {
    const r = await fetch('/api/rondas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ residente_id, situacao, observacao: obs[residente_id] || null }) })
    const j = await r.json()
    if (j.ok) {
      toast(situacao === 'Necessitou atendimento' ? 'Registrado — item de ALTA prioridade criado no plantão' : 'Ronda registrada', 'ok')
      setObs({ ...obs, [residente_id]: '' }); carregar()
    } else toast(j.erro, 'erro')
  }

  const totalDe = (rid: string) => (hid?.registros ?? []).filter(r => r.residente_id === rid).reduce((s, r) => s + r.volume_ml, 0)
  const ultimaRonda = (rid: string) => (ron?.registros ?? []).find(r => r.residente_id === rid)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Cuidados diários</h1>
        <span className="spacer" />
        <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: 160 }} />
      </div>

      <div className="tabs">
        <button className={`tab ${aba === 'hidratacao' ? 'on' : ''}`} onClick={() => setAba('hidratacao')}>💧 Mapa de hidratação</button>
        <button className={`tab ${aba === 'rondas' ? 'on' : ''}`} onClick={() => setAba('rondas')}>🌙 Rondas</button>
      </div>

      {aba === 'hidratacao' && (
        <div className="card">
          <div className="alert alert-i">Toque em <strong>+100 / +200 / +300</strong> a cada oferta de líquido. A barra mostra o total do dia contra a meta individual (padrão 1.500 ml — ajustável no prontuário).</div>
          {!hid ? <div className="empty">Carregando...</div> : hid.residentes.length === 0 ? <div className="empty">Nenhuma residente ativa</div> : (
            hid.residentes.map(r => {
              const total = totalDe(r.id)
              const meta = r.meta_hidratacao_ml ?? 1500
              const pct = Math.min(100, Math.round(100 * total / meta))
              const cor = pct >= 100 ? 'var(--verde)' : pct >= 60 ? 'var(--azul)' : pct >= 30 ? 'var(--amarelo)' : 'var(--vermelho)'
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1EFE8', flexWrap: 'wrap' }}>
                  <div style={{ width: 190, minWidth: 150 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Q.{r.quarto ?? '—'} · meta {meta} ml</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ background: '#F1EFE8', borderRadius: 6, height: 16, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: cor, height: '100%', borderRadius: 6, transition: 'width .3s' }} />
                      <span style={{ position: 'absolute', inset: 0, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pct > 55 ? '#fff' : 'var(--txt)' }}>
                        {total} ml ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[100, 200, 300].map(v => (
                      <button key={v} className="btn btn-sm" onClick={() => registrarAgua(r.id, v)}>+{v}</button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {aba === 'rondas' && (
        <div className="card">
          <div className="alert alert-i">Registre a situação de cada residente durante a ronda. <strong>"Necessitou atendimento"</strong> cria automaticamente um item de prioridade ALTA no quadro de plantão.</div>
          {!ron ? <div className="empty">Carregando...</div> : ron.residentes.length === 0 ? <div className="empty">Nenhuma residente ativa</div> : (
            ron.residentes.map(r => {
              const ult = ultimaRonda(r.id)
              return (
                <div key={r.id} style={{ padding: '9px 0', borderBottom: '1px solid #F1EFE8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ width: 190, minWidth: 150 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{r.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                        Q.{r.quarto ?? '—'} {ult && <>· última: <span className={`badge ${COR_SIT[ult.situacao]}`}>{ult.situacao}</span> {new Date(ult.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {SITUACOES.map(s => (
                        <button key={s} className={`btn btn-sm ${s === 'Necessitou atendimento' ? 'btn-d' : ''}`} onClick={() => registrarRonda(r.id, s)}>{s}</button>
                      ))}
                    </div>
                    <input placeholder="obs. (opcional)" value={obs[r.id] ?? ''} onChange={e => setObs({ ...obs, [r.id]: e.target.value })} style={{ flex: 1, minWidth: 120, fontSize: 11 }} />
                  </div>
                </div>
              )
            })
          )}
          {(ron?.registros ?? []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Registros do dia ({ron!.registros.length})</div>
              {ron!.registros.slice(0, 30).map((x: D) => (
                <div key={x.id} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid #F1EFE8', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--txt3)' }}>{new Date(x.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <strong>{x.residentes?.nome}</strong>
                  <span className={`badge ${COR_SIT[x.situacao]}`}>{x.situacao}</span>
                  {x.observacao && <span style={{ color: 'var(--txt2)' }}>{x.observacao}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
