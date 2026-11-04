'use client'
// Botões de ação do painel do operador
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

interface Props { ilpi: { id: string; nome: string; plano: string; ativo: boolean } }

export default function AdminAcoes({ ilpi }: Props) {
  const [aberto, setAberto] = useState(false)
  const [plano, setPlano] = useState(ilpi.plano)
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function salvar(campos: Record<string, unknown>) {
    setSalvando(true)
    const r = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ilpi.id, ...campos }) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('ILPI atualizada', 'ok'); setAberto(false); router.refresh() }
    else toast(j.erro, 'erro')
  }

  return (
    <>
      <button className="btn btn-sm" onClick={() => setAberto(true)}>Gerir</button>
      <Modal aberto={aberto} titulo={`Gerir — ${ilpi.nome}`} onFechar={() => setAberto(false)} larguraMax={420}>
        <label>Plano</label>
        <select value={plano} onChange={e => setPlano(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="gratuito">Gratuito — R$ 0</option>
          <option value="essencial">Essencial — R$ 97/mês</option>
          <option value="completo">Completo — R$ 197/mês</option>
        </select>
        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button className={`btn ${ilpi.ativo ? 'btn-d' : 'btn-s'}`} onClick={() => salvar({ ativo: !ilpi.ativo })} disabled={salvando}>
            {ilpi.ativo ? 'Suspender acesso' : 'Reativar acesso'}
          </button>
          <button className="btn btn-p" onClick={() => salvar({ plano })} disabled={salvando}>
            {salvando ? '...' : 'Salvar plano'}
          </button>
        </div>
      </Modal>
    </>
  )
}
