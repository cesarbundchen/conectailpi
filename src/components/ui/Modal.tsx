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
        position: 'fixed', inset: 0, background: 'rgba(1, 30, 44, .5)', zIndex: 300,
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 14px', overflowY: 'auto',
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={titulo} style={{ background: 'var(--branco)', borderRadius: 18, width: '100%', maxWidth: larguraMax, boxShadow: 'var(--sombra-3)', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--brd)', background: '#F6FAFB',
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--azul)' }}>{titulo}</div>
          <button onClick={onFechar} aria-label="Fechar" style={{
            background: 'var(--branco)', border: '1px solid var(--brd)', fontSize: 20, cursor: 'pointer',
            color: 'var(--txt2)', width: 36, height: 36, borderRadius: 10, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: 20, maxHeight: '74vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
