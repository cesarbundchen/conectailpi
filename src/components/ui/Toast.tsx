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
    ok: '#0F6E56', erro: '#A32D2D', info: '#1A1A18',
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map(m => (
          <div key={m.id} style={{
            background: cores[m.tipo], color: '#fff', padding: '10px 16px',
            borderRadius: 8, fontSize: 13, maxWidth: 320, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          }}>
            {m.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
