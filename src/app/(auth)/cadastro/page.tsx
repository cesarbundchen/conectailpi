'use client'
// Cadastro de nova ILPI — exige código de convite (INVITE_SECRET)
// Cria: ILPI + usuário admin + perfil, em uma única transação na API
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MarcaAcesso from '@/components/layout/MarcaAcesso'

type F = Record<string, string>

export default function CadastroPage() {
  const [form, setForm] = useState<F>({})
  const [erro, setErro] = useState('')
  const [load, setLoad] = useState(false)
  const router = useRouter()

  const inp = (k: string) => ({ id: k, value: form[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) })

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.convite || !form.ilpi_nome || !form.admin_nome || !form.email || !form.senha) {
      setErro('Preencha todos os campos obrigatórios.'); return
    }
    if ((form.senha ?? '').length < 8) { setErro('A senha precisa de pelo menos 8 caracteres.'); return }
    setLoad(true)
    const r = await fetch('/api/cadastro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const j = await r.json()
    if (!j.ok) { setErro(j.erro ?? 'Erro no cadastro.'); setLoad(false); return }
    router.push('/login?cadastro=ok')
  }

  return (
    <div className="acesso">
      <MarcaAcesso
        titulo="Traga sua instituição para o ConectaILPI."
        subtitulo="Em poucos minutos sua equipe passa a registrar a rotina num só lugar." />

      <div className="acesso-form">
        <div className="acesso-card" style={{ maxWidth: 520 }}>
          <img src="/logo.png" alt="ConectaILPI" className="acesso-logo-mob" />
          <h1>Cadastrar instituição</h1>
          <p className="sub">O cadastro exige um código de convite fornecido pela equipe Conecta ILPI.</p>

          <form onSubmit={cadastrar}>
            <div className="form-grid">
              <div className="full"><label htmlFor="convite">Código de convite <span className="req">*</span></label><input {...inp('convite')} autoFocus /></div>
              <div className="full"><label htmlFor="ilpi_nome">Nome da ILPI <span className="req">*</span></label><input {...inp('ilpi_nome')} placeholder="Lar São Francisco" /></div>
              <div><label htmlFor="cnpj">CNPJ</label><input {...inp('cnpj')} inputMode="numeric" /></div>
              <div><label htmlFor="telefone">Telefone</label><input {...inp('telefone')} inputMode="tel" /></div>
              <div className="full" style={{ borderTop: '1px solid var(--brd)', paddingTop: 14, marginTop: 4 }}>
                <p style={{ fontWeight: 900, color: 'var(--azul)', fontSize: 14 }}>Administrador da conta</p>
              </div>
              <div className="full"><label htmlFor="admin_nome">Nome completo <span className="req">*</span></label><input {...inp('admin_nome')} autoComplete="name" /></div>
              <div><label htmlFor="email">E-mail <span className="req">*</span></label><input type="email" {...inp('email')} autoComplete="email" /></div>
              <div><label htmlFor="senha">Senha (mín. 8) <span className="req">*</span></label><input type="password" {...inp('senha')} autoComplete="new-password" /></div>
            </div>
            {erro && <div className="alert alert-d" role="alert" style={{ marginTop: 14 }}>{erro}</div>}
            <button type="submit" className="btn btn-p btn-bloco" style={{ marginTop: 18 }} disabled={load}>
              {load ? 'Criando conta...' : 'Criar conta da ILPI'}
            </button>
          </form>
          <div className="acesso-rodape">
            Já tem conta? <a href="/login" style={{ fontWeight: 800 }}>Entrar</a>
          </div>
        </div>
      </div>
    </div>
  )
}
