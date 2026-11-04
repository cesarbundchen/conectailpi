'use client'
// Cadastro de nova ILPI — exige código de convite (INVITE_SECRET)
// Cria: ILPI + usuário admin + perfil, em uma única transação na API
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type F = Record<string, string>

export default function CadastroPage() {
  const [form, setForm] = useState<F>({})
  const [erro, setErro] = useState('')
  const [load, setLoad] = useState(false)
  const router = useRouter()

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) })

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: '32px 30px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)' }}>🏥 ConectaILPI</div>
        <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 20 }}>Cadastro de nova instituição</div>

        <div className="alert alert-i">O cadastro exige um <strong>código de convite</strong> fornecido pela equipe Conecta ILPI.</div>

        <form onSubmit={cadastrar}>
          <div className="form-grid">
            <div className="full"><label>Código de convite <span className="req">*</span></label><input {...inp('convite')} autoFocus /></div>
            <div className="full"><label>Nome da ILPI <span className="req">*</span></label><input {...inp('ilpi_nome')} placeholder="Lar São Francisco" /></div>
            <div><label>CNPJ</label><input {...inp('cnpj')} /></div>
            <div><label>Telefone</label><input {...inp('telefone')} /></div>
            <div className="full" style={{ borderTop: '1px solid var(--brd)', paddingTop: 12, marginTop: 4 }}>
              <label style={{ fontWeight: 700, color: 'var(--txt)' }}>Administrador da conta</label>
            </div>
            <div className="full"><label>Nome completo <span className="req">*</span></label><input {...inp('admin_nome')} /></div>
            <div><label>E-mail <span className="req">*</span></label><input type="email" {...inp('email')} /></div>
            <div><label>Senha (mín. 8) <span className="req">*</span></label><input type="password" {...inp('senha')} /></div>
          </div>
          {erro && <div className="alert alert-d" style={{ marginTop: 12 }}>{erro}</div>}
          <button type="submit" className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 14 }} disabled={load}>
            {load ? 'Criando conta...' : 'Criar conta da ILPI'}
          </button>
        </form>
        <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 16, textAlign: 'center' }}>
          Já tem conta? <a href="/login" style={{ color: 'var(--azul)' }}>Entrar</a>
        </div>
      </div>
    </div>
  )
}
