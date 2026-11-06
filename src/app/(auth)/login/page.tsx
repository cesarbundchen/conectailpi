'use client'
import { useState, useEffect } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import MarcaAcesso from '@/components/layout/MarcaAcesso'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [load, setLoad] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const e = q.get('erro')
    if (e === 'desativado') setErro('Sua conta foi desativada. Fale com o administrador da ILPI.')
    if (e === 'suspensa') setErro('O acesso desta instituição está suspenso. Contate a Conecta ILPI.')
    if (q.get('cadastro') === 'ok') setAviso('Instituição cadastrada. Entre com o e-mail e a senha do administrador.')
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
    <div className="acesso">
      <MarcaAcesso
        titulo="A rotina da ILPI inteira, num só lugar."
        subtitulo="Residentes, medicamentos, cuidados, equipe, família e financeiro conectados." />

      <div className="acesso-form">
        <div className="acesso-card">
          <img src="/logo.png" alt="ConectaILPI" className="acesso-logo-mob" />
          <h1>Bem-vindo de volta</h1>
          <p className="sub">Entre com o acesso da sua equipe.</p>

          {aviso && <div className="alert alert-s">{aviso}</div>}

          <form onSubmit={entrar}>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus placeholder="voce@instituicao.com.br" />
            </div>
            <div className="campo">
              <label htmlFor="senha">Senha</label>
              <div className="campo-senha">
                <input id="senha" type={verSenha ? 'text' : 'password'} autoComplete="current-password"
                  value={senha} onChange={e => setSenha(e.target.value)} required />
                <button type="button" onClick={() => setVerSenha(v => !v)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {verSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {erro && <div className="alert alert-d" role="alert">{erro}</div>}
            <button type="submit" className="btn btn-p btn-bloco" disabled={load}>
              {load ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="acesso-rodape">
            Acesso restrito à equipe. Sem conta? Solicite ao administrador da sua ILPI.
          </div>
        </div>
      </div>
    </div>
  )
}
