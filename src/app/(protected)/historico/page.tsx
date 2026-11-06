'use client'
// Histórico de auditoria — todas as ações do sistema
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

type H = Record<string, any>
const MODULOS = ['', 'Residentes', 'Medicamentos', 'Ocorrências', 'Atendimentos', 'Restrições', 'Financeiro', 'Documentos', 'Responsáveis']
const ICONES: Record<string, string> = {
  Residentes: '👥', Medicamentos: '💊', 'Ocorrências': '⚠️', Atendimentos: '🩺',
  'Restrições': '🚫', Financeiro: '💰', Documentos: '📂', 'Responsáveis': '👤',
}

export default function HistoricoPage() {
  const [lista, setLista] = useState<H[]>([])
  const [modulo, setModulo] = useState('')
  const [load, setLoad] = useState(true)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    const q = modulo ? `?modulo=${encodeURIComponent(modulo)}` : ''
    const r = await fetch(`/api/historico${q}`)
    const j = await r.json()
    if (j.ok) setLista(j.dados); else toast('Erro ao carregar histórico', 'erro')
    setLoad(false)
  }, [modulo, toast])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Histórico de auditoria</h1>
        <select value={modulo} onChange={e => setModulo(e.target.value)} style={{ width: 170, marginLeft: 'auto' }}>
          {MODULOS.map(m => <option key={m} value={m}>{m || 'Todos os módulos'}</option>)}
        </select>
      </div>

      <div className="alert alert-i">Registro imutável de todas as ações. Nenhum evento pode ser editado ou excluído — exigência de conformidade (ANVISA RDC 502 / LGPD).</div>

      <div className="card" style={{ padding: '4px 16px' }}>
        {load ? <div className="empty">Carregando...</div> :
          lista.length === 0 ? <div className="empty">Nenhum registro</div> :
            lista.map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--brd-soft)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{ICONES[h.modulo] ?? '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12 }}>
                    <strong>{h.modulo}</strong> · {h.acao}
                    {h.residentes?.nome && <span style={{ color: 'var(--txt2)' }}> · {h.residentes.nome}</span>}
                  </div>
                  {h.descricao && <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{h.descricao}</div>}
                </div>
                <span style={{ fontSize: 10, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>{new Date(h.criado_em).toLocaleString('pt-BR')}</span>
              </div>
            ))}
      </div>
    </div>
  )
}
