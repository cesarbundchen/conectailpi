'use client'
import { useState, useEffect } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [load, setLoad] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('erro')
    if (e === 'desativado') setErro('Sua conta foi desativada. Fale com o administrador da ILPI.')
    if (e === 'suspensa') setErro('O acesso desta instituição está suspenso. Contate a Conecta ILPI.')
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setLoad(true)
    const sb = createBrowserSupabase()
    const { error } = await sb.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setLoad(false); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '36px 32px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', marginBottom: 2 }}>🏥 ConectaILPI</div>
        <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 24 }}>Acesso exclusivo da equipe</div>
        <form onSubmit={entrar}>
          <label>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus style={{ marginBottom: 12 }} />
          <label>Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required style={{ marginBottom: 12 }} />
          {erro && <div className="alert alert-d">{erro}</div>}
          <button type="submit" className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: 11 }} disabled={load}>
            {load ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--brd)', textAlign: 'center' }}>
          Acesso restrito. Sem conta? Solicite ao administrador.
        </div>
      </div>
    </div>
  )
}
