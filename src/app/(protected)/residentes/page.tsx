'use client'
// Listagem de residentes — busca, filtro por status
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import type { Residente } from '@/types/database'

const STATUS = ['', 'Triagem', 'Ativa', 'Ausente', 'Inativa', 'Falecida']

export default function ResidentesPage() {
  const [lista, setLista] = useState<Residente[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('Ativa')
  const [load, setLoad] = useState(true)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setLoad(true)
    try {
      const q = new URLSearchParams()
      if (busca) q.set('busca', busca)
      if (status) q.set('status', status)
      const r = await fetch(`/api/residentes?${q}`)
      const j = await r.json()
      if (!j.ok) throw new Error(j.erro)
      setLista(j.dados)
    } catch { toast('Erro ao carregar residentes', 'erro') }
    setLoad(false)
  }, [busca, status, toast])

  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t) }, [carregar])

  const idade = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 3.156e10) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Residentes</h1>
        <Link href="/admissao" className="btn btn-p" style={{ marginLeft: 'auto' }}>+ Nova admissão</Link>
      </div>

      <div className="card" style={{ display: 'flex', gap: 10, padding: 12, marginBottom: 10 }}>
        <input placeholder="Buscar por nome, CPF ou quarto..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1 }} />
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 160 }}>
          {STATUS.map(s => <option key={s} value={s}>{s || 'Todos os status'}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {load ? <div className="empty">Carregando...</div> :
          lista.length === 0 ? <div className="empty">Nenhuma residente encontrada</div> : (
            <table>
              <thead><tr><th>Nome</th><th>Idade</th><th>Quarto/Leito</th><th>Dependência</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {lista.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.nome}</td>
                    <td>{idade(r.data_nascimento) ?? '—'}</td>
                    <td>Q.{r.quarto ?? '—'} / L.{r.leito ?? '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--txt2)' }}>{r.grau_dependencia ?? '—'}</td>
                    <td><Badge status={r.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/residentes/${r.id}`} className="btn btn-sm">Prontuário →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
