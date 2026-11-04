'use client'
// Modal reutilizável — todos os CRUDs usam este componente
import type { ReactNode } from 'react'

interface Props {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  larguraMax?: number
}

export default function Modal({ aberto, titulo, onFechar, children, larguraMax = 640 }: Props) {
  if (!aberto) return null
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: larguraMax }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #E0DDD6',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
          <button onClick={onFechar} aria-label="Fechar" style={{
            background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
            color: '#6B6A65', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: 18, maxHeight: '72vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
