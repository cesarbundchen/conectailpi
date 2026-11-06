'use client'
// Toast global — usar via hook useToast() em qualquer client component
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastTipo = 'ok' | 'erro' | 'info'
interface ToastMsg { id: number; texto: string; tipo: ToastTipo }

const ToastCtx = createContext<{ toast: (texto: string, tipo?: ToastTipo) => void }>({ toast: () => {} })

export function useToast() { return useContext(ToastCtx) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msgs, setMsgs] = useState<ToastMsg[]>([])

  const toast = useCallback((texto: string, tipo: ToastTipo = 'info') => {
    const id = Date.now()
    setMsgs(m => [...m, { id, texto, tipo }])
    setTimeout(() => setMsgs(m => m.filter(x => x.id !== id)), 3500)
  }, [])

  const cores: Record<ToastTipo, string> = {
    ok: '#007A70', erro: '#B42318', info: '#01435F',
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" style={{ position: 'fixed', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', right: 20, left: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, pointerEvents: 'none' }}>
        {msgs.map(m => (
          <div key={m.id} style={{
            background: cores[m.tipo], color: '#fff', padding: '12px 18px',
            borderRadius: 12, fontSize: 14, fontWeight: 700, maxWidth: 360, boxShadow: 'var(--sombra-2)',
          }}>
            {m.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
