'use client'
// Configurações — dados da ILPI e gestão de usuários (admin apenas)
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

type D = Record<string, any>
type F = Record<string, string>
const PAPEIS = ['admin', 'coordenador', 'tecnico', 'cuidador']
const PAPEL_LABEL: Record<string, string> = { admin: 'Administrador', coordenador: 'Coordenador(a)', tecnico: 'Técnico(a)', cuidador: 'Cuidador(a)' }

export default function ConfiguracoesPage() {
  const [ilpi, setIlpi] = useState<D | null>(null)
  const [usuarios, setUsuarios] = useState<D[]>([])
  const [meuPapel, setMeuPapel] = useState('')
  const [form, setForm] = useState<F>({})
  const [mUser, setMUser] = useState(false)
  const [novo, setNovo] = useState<F>({ papel: 'cuidador' })
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    const r = await fetch('/api/configuracoes')
    const j = await r.json()
    if (j.ok) {
      setIlpi(j.dados.ilpi); setUsuarios(j.dados.usuarios); setMeuPapel(j.dados.meu_papel)
      const i = j.dados.ilpi
      setForm({ nome: i.nome ?? '', cnpj: i.cnpj ?? '', telefone: i.telefone ?? '', email: i.email ?? '', endereco: i.endereco ?? '', capacidade: String(i.capacidade ?? 20) })
    } else toast(j.erro, 'erro')
  }, [toast])

  useEffect(() => { carregar() }, [carregar])

  const inp = (k: string, f: F, set: (x: F) => void) => ({ value: f[k] ?? '', onChange: (e: React.ChangeEvent<any>) => set({ ...f, [k]: e.target.value }) })
  const souAdmin = meuPapel === 'admin'

  async function salvarIlpi() {
    setSalvando(true)
    const r = await fetch('/api/configuracoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, capacidade: Number(form.capacidade) }) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Dados da ILPI atualizados', 'ok'); carregar() } else toast(j.erro, 'erro')
  }

  async function criarUsuario() {
    if (!novo.nome || !novo.email || !novo.senha) { toast('Nome, e-mail e senha são obrigatórios', 'erro'); return }
    if (novo.senha.length < 8) { toast('Senha: mínimo 8 caracteres', 'erro'); return }
    setSalvando(true)
    const r = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novo) })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast('Usuário criado', 'ok'); setMUser(false); setNovo({ papel: 'cuidador' }); carregar() }
    else toast(j.erro, 'erro')
  }

  async function alternarAtivo(u: D) {
    const r = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, ativo: !u.ativo }) })
    const j = await r.json()
    if (j.ok) { toast(u.ativo ? 'Usuário desativado' : 'Usuário reativado', 'ok'); carregar() } else toast(j.erro, 'erro')
  }

  async function mudarPapel(u: D, papel: string) {
    const r = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, papel }) })
    const j = await r.json()
    if (j.ok) { toast('Papel atualizado', 'ok'); carregar() } else toast(j.erro, 'erro')
  }

  if (!ilpi) return <div className="empty">Carregando configurações...</div>

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Configurações</h1>

      {!souAdmin && <div className="alert alert-w">Apenas administradores podem alterar configurações. Visualização somente leitura.</div>}

      <div className="card">
        <div className="card-title">🏥 Dados da instituição
          <span className="spacer" />
          <span className="badge bg-info">Plano: {ilpi.plano}</span>
        </div>
        <div className="form-grid">
          <div className="full"><label>Nome</label><input {...inp('nome', form, setForm)} disabled={!souAdmin} /></div>
          <div><label>CNPJ</label><input {...inp('cnpj', form, setForm)} disabled={!souAdmin} /></div>
          <div><label>Telefone</label><input {...inp('telefone', form, setForm)} disabled={!souAdmin} /></div>
          <div><label>E-mail</label><input type="email" {...inp('email', form, setForm)} disabled={!souAdmin} /></div>
          <div><label>Capacidade (leitos)</label><input type="number" {...inp('capacidade', form, setForm)} disabled={!souAdmin} /></div>
          <div className="full"><label>Endereço</label><input {...inp('endereco', form, setForm)} disabled={!souAdmin} /></div>
        </div>
        {souAdmin && (
          <div className="form-actions">
            <button className="btn btn-p" onClick={salvarIlpi} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">👥 Usuários da equipe ({usuarios.length})
          <span className="spacer" />
          {souAdmin && <button className="btn btn-p btn-sm" onClick={() => setMUser(true)}>+ Novo usuário</button>}
        </div>
        <table>
          <thead><tr><th>Nome</th><th>Papel</th><th>Situação</th>{souAdmin && <th></th>}</tr></thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.nome}</td>
                <td>
                  {souAdmin ? (
                    <select value={u.papel} onChange={e => mudarPapel(u, e.target.value)} style={{ width: 150, padding: '4px 8px', fontSize: 11 }}>
                      {PAPEIS.map(p => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
                    </select>
                  ) : PAPEL_LABEL[u.papel]}
                </td>
                <td>{u.ativo ? <span className="badge bg-ativa">Ativo</span> : <span className="badge bg-inativa">Desativado</span>}</td>
                {souAdmin && (
                  <td style={{ textAlign: 'right' }}>
                    <button className={`btn btn-sm ${u.ativo ? 'btn-w' : 'btn-s'}`} onClick={() => alternarAtivo(u)}>
                      {u.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="alert alert-i" style={{ marginTop: 10 }}>
          <strong>Papéis:</strong> Administrador (tudo) · Coordenador (tudo exceto configurações) · Técnico e Cuidador (operação diária, sem financeiro).
        </div>
      </div>

      <Modal aberto={mUser} titulo="Novo usuário da equipe" onFechar={() => setMUser(false)} larguraMax={480}>
        <div className="form-grid">
          <div className="full"><label>Nome completo <span className="req">*</span></label><input {...inp('nome', novo, setNovo)} /></div>
          <div><label>E-mail <span className="req">*</span></label><input type="email" {...inp('email', novo, setNovo)} /></div>
          <div><label>Senha (mín. 8) <span className="req">*</span></label><input type="password" {...inp('senha', novo, setNovo)} /></div>
          <div><label>Papel</label>
            <select {...inp('papel', novo, setNovo)}>{PAPEIS.map(p => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}</select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMUser(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={criarUsuario} disabled={salvando}>{salvando ? '...' : 'Criar usuário'}</button>
        </div>
      </Modal>
    </div>
  )
}
