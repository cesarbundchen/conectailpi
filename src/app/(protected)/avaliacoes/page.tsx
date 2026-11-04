'use client'
// Escalas de avaliação — Katz (AVD), Braden (lesão por pressão), Morse (quedas)
// As definições/da pontuação vivem no servidor; aqui apenas replicamos para o formulário
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { ESCALAS } from '@/lib/escalas'
import { usePapel } from '@/lib/usePapel'

type D = Record<string, any>

export default function AvaliacoesPage() {
  const [residentes, setResidentes] = useState<D[]>([])
  const [residente, setResidente] = useState('')
  const [escala, setEscala] = useState('Katz')
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [historico, setHistorico] = useState<D[]>([])
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const { clinico, carregado } = usePapel()

  useEffect(() => { fetch('/api/residentes').then(r => r.json()).then(j => { if (j.ok) setResidentes(j.dados.filter((x: D) => x.status === 'Ativa')) }) }, [])
  const carregarHist = useCallback(async () => {
    const q = residente ? `?residente_id=${residente}` : ''
    const r = await fetch(`/api/avaliacoes${q}`); const j = await r.json()
    if (j.ok) setHistorico(j.dados)
  }, [residente])
  useEffect(() => { carregarHist() }, [carregarHist])

  const def = ESCALAS[escala]
  const completo = def.itens.every(i => respostas[i.id] !== undefined)
  const pontuacao = def.itens.reduce((s, i) => s + (respostas[i.id] ?? 0), 0)

  async function aplicar() {
    if (!residente) { toast('Escolha a residente', 'erro'); return }
    if (!completo) { toast('Responda todos os itens', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/avaliacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ residente_id: residente, escala, respostas }) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) {
      toast(`${escala}: ${j.dados.pontuacao} pontos — ${j.dados.classificacao}`, 'ok')
      setRespostas({}); carregarHist()
    } else toast(j.erro, 'erro')
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Escalas de avaliação</h1>
      {carregado && !clinico && <div className="alert alert-w">Aplicação de escalas é restrita a técnico(a), coordenador(a) e admin. Você pode consultar o histórico abaixo.</div>}

      <div className="card">
        <div className="form-grid">
          <div><label>Residente <span className="req">*</span></label>
            <select value={residente} onChange={e => setResidente(e.target.value)}>
              <option value="">Escolha...</option>
              {residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <div><label>Escala</label>
            <select value={escala} onChange={e => { setEscala(e.target.value); setRespostas({}) }}>
              {Object.keys(ESCALAS).map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, margin: '12px 0 8px', color: 'var(--azul)' }}>{def.nome}</div>
        {def.itens.map(item => (
          <div key={item.id} style={{ padding: '7px 0', borderBottom: '1px solid #F1EFE8' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{item.rotulo}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {item.opcoes.map(op => (
                <button key={op.rotulo} type="button"
                  className={`btn btn-sm ${respostas[item.id] === op.pontos ? 'btn-p' : ''}`}
                  onClick={() => setRespostas({ ...respostas, [item.id]: op.pontos })}>
                  {op.rotulo}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <div style={{ fontSize: 13 }}>Pontuação parcial: <strong style={{ fontSize: 17 }}>{pontuacao}</strong></div>
          <span className="spacer" />
          <button className="btn btn-p" onClick={aplicar} disabled={salvando || !completo || !residente || !clinico}>
            {salvando ? 'Salvando...' : '✓ Aplicar avaliação'}
          </button>
        </div>
        <div className="alert alert-i" style={{ marginTop: 10 }}>
          A pontuação e a classificação finais são <strong>recalculadas no servidor</strong> e gravadas com auditoria — o resultado exibido no histórico é a fonte oficial.
        </div>
      </div>

      <div className="card">
        <div className="card-title">📐 Histórico de avaliações {residente && residentes.find(r => r.id === residente) ? `— ${residentes.find(r => r.id === residente)!.nome}` : '(todas)'}</div>
        {historico.length === 0 ? <div className="empty">Nenhuma avaliação aplicada ainda</div> : (
          <table>
            <thead><tr><th>Data</th><th>Residente</th><th>Escala</th><th>Pontos</th><th>Classificação</th></tr></thead>
            <tbody>
              {historico.map(h => (
                <tr key={h.id}>
                  <td style={{ fontSize: 11 }}>{new Date(h.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td>{h.residentes?.nome}</td>
                  <td>{h.escala}</td>
                  <td><strong>{h.pontuacao}</strong></td>
                  <td><span className={`badge ${/muito alto|alto|importante/i.test(h.classificacao) ? 'bg-aberta' : /moderado|parcial/i.test(h.classificacao) ? 'bg-pendente' : 'bg-ativa'}`}>{h.classificacao}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
