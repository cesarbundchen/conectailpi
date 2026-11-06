'use client'
// Configuração dos perfis de acesso da instituição.
// Cada empresa define seus próprios perfis e marca, módulo a módulo,
// o que cada um pode consultar, incluir, alterar e arquivar.
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { MODULOS, GRUPOS, ROTULO_ACAO, AJUDA_ACAO, perm, type Acao, type PerfilModelo } from '@/lib/modulos'

type D = Record<string, any>
const VINCULOS: Record<string, string> = {
  proprio: 'Funcionário próprio', autonomo: 'Autônomo / prestador PJ',
  voluntario: 'Voluntário de parceria', terceirizado: 'Empresa terceirizada',
}

export default function PerfisPage() {
  const [perfis, setPerfis] = useState<D[]>([])
  const [contagem, setContagem] = useState<Record<string, number>>({})
  const [modelos, setModelos] = useState<PerfilModelo[]>([])
  const [editando, setEditando] = useState<D | null>(null)
  const [form, setForm] = useState<D>({})
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [verModelos, setVerModelos] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    const r = await fetch('/api/perfis-acesso'); const j = await r.json()
    if (j.ok) { setPerfis(j.dados.perfis); setContagem(j.dados.contagem); setModelos(j.dados.modelos) }
    else toast(j.erro, 'erro')
  }, [toast])
  useEffect(() => { carregar() }, [carregar])

  function abrir(p: D | null, modelo?: PerfilModelo) {
    if (p) {
      setForm({ id: p.id, nome: p.nome, descricao: p.descricao ?? '', formacoes: p.formacoes ?? '', vinculo: p.vinculo })
      setSel(new Set(p.permissoes ?? []))
    } else if (modelo) {
      setForm({ nome: modelo.nome, descricao: modelo.descricao, formacoes: modelo.formacoes, vinculo: 'proprio' })
      setSel(new Set(modelo.permissoes))
      setVerModelos(false)
    } else {
      setForm({ nome: '', descricao: '', formacoes: '', vinculo: 'proprio' })
      setSel(new Set())
    }
    setEditando(p ?? { novo: true })
  }

  function alternar(modId: string, acao: Acao) {
    const chave = perm(modId, acao)
    const novo = new Set(sel)
    if (novo.has(chave)) {
      novo.delete(chave)
      // desmarcar "ver" derruba as demais ações do módulo (não faz sentido escrever sem ver)
      if (acao === 'ver') for (const a of ['incluir', 'editar', 'arquivar'] as Acao[]) novo.delete(perm(modId, a))
    } else {
      novo.add(chave)
      if (acao !== 'ver') novo.add(perm(modId, 'ver'))  // escrever exige ver
    }
    setSel(novo)
  }

  function alternarModulo(modId: string, acoes: Acao[]) {
    const todas = acoes.every(a => sel.has(perm(modId, a)))
    const novo = new Set(sel)
    for (const a of acoes) todas ? novo.delete(perm(modId, a)) : novo.add(perm(modId, a))
    setSel(novo)
  }

  async function salvar() {
    if (!form.nome?.trim()) { toast('Dê um nome ao perfil', 'erro'); return }
    setSalvando(true)
    const metodo = form.id ? 'PATCH' : 'POST'
    const r = await fetch('/api/perfis-acesso', {
      method: metodo, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, permissoes: [...sel] }),
    })
    const j = await r.json(); setSalvando(false)
    if (j.ok) { toast(form.id ? 'Perfil atualizado ✓' : 'Perfil criado ✓'); setEditando(null); carregar() }
    else toast(j.erro, 'erro')
  }

  const inp = (k: string) => ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value }) })
  const sensiveisMarcados = MODULOS.filter(m => m.sensivel && sel.has(perm(m.id, 'ver'))).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Perfis de acesso</h1>
        <span className="spacer" />
        <button className="btn" onClick={() => setVerModelos(true)}>📋 Usar um modelo</button>
        <button className="btn btn-p" onClick={() => abrir(null)}>+ Criar perfil</button>
      </div>

      <div className="alert alert-i">
        Cada perfil define <strong>o que a pessoa vê e o que pode fazer em cada parte do sistema</strong>.
        Você cria quantos perfis quiser, com os nomes da sua instituição. Regra fixa da plataforma:
        <strong> quem tem permissão de incluir nunca ganha a de arquivar automaticamente</strong> — arquivar sempre passa pelo Operador de Dados.
      </div>

      {perfis.length === 0 ? (
        <div className="card"><div className="empty">Nenhum perfil criado ainda. Comece por um modelo pronto e ajuste depois.</div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Perfil</th><th>Formações</th><th>Vínculo</th><th>Módulos</th><th>Pessoas</th><th></th></tr></thead>
            <tbody>
              {perfis.map(p => {
                const mods = new Set((p.permissoes ?? []).map((x: string) => x.split(':')[0]))
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.nome} {p.protegido && <span className="badge bg-info">protegido</span>}</div>
                      {p.descricao && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{p.descricao}</div>}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--txt2)' }}>{p.formacoes || '—'}</td>
                    <td><span className="badge bg-info">{VINCULOS[p.vinculo]}</span></td>
                    <td><strong>{mods.size}</strong> de {MODULOS.length}</td>
                    <td>{contagem[p.id] ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm" disabled={p.protegido} onClick={() => abrir(p)}>
                        {p.protegido ? 'Bloqueado' : 'Configurar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modelos prontos ── */}
      <Modal aberto={verModelos} titulo="Modelos de perfil (você pode ajustar tudo depois)" onFechar={() => setVerModelos(false)} larguraMax={620}>
        <div className="alert alert-i">Escolha o mais próximo da sua realidade. O modelo só preenche as caixas — nada é gravado até você salvar.</div>
        {modelos.map(m => (
          <div key={m.nome} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--brd-soft)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{m.nome}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{m.descricao}</div>
              <div style={{ fontSize: 10, color: 'var(--azul)', marginTop: 2 }}>{m.formacoes} · {m.permissoes.length} permissões</div>
            </div>
            <button className="btn btn-sm btn-p" onClick={() => abrir(null, m)}>Usar</button>
          </div>
        ))}
      </Modal>

      {/* ── Editor de permissões ── */}
      <Modal aberto={!!editando} titulo={form.id ? `Configurar — ${form.nome}` : 'Novo perfil de acesso'} onFechar={() => setEditando(null)} larguraMax={720}>
        <div className="form-grid">
          <div><label>Nome do perfil <span className="req">*</span></label><input {...inp('nome')} placeholder="Ex.: Enfermeira do noturno" /></div>
          <div><label>Tipo de vínculo</label>
            <select {...inp('vinculo')}>{Object.entries(VINCULOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
          <div className="full"><label>Formações que se encaixam</label><input {...inp('formacoes')} placeholder="Ex.: Enfermeiro(a) COREN, técnico(a) de enfermagem" /></div>
          <div className="full"><label>Descrição</label><input {...inp('descricao')} placeholder="Para que serve este perfil" /></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Permissões por módulo</div>
          <span className="spacer" />
          <span className="badge bg-info">{sel.size} marcadas</span>
          {sensiveisMarcados > 0 && <span className="badge bg-pendente">{sensiveisMarcados} módulos sensíveis</span>}
        </div>

        {GRUPOS.map(grupo => (
          <div key={grupo} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{grupo}</div>
            {MODULOS.filter(m => m.grupo === grupo).map(m => (
              <div key={m.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--brd-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ width: 210, minWidth: 160 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {m.icone} {m.nome} {m.sensivel && <span title="Dado sensível — LGPD" style={{ color: 'var(--vermelho)' }}>•</span>}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--txt3)' }}>{m.descricao}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                    {m.acoes.map(a => {
                      const marcado = sel.has(perm(m.id, a))
                      return (
                        <button key={a} type="button" title={AJUDA_ACAO[a]}
                          className={`btn btn-sm ${marcado ? (a === 'arquivar' ? 'btn-d' : 'btn-p') : ''}`}
                          onClick={() => alternar(m.id, a)}>
                          {marcado ? '✓ ' : ''}{ROTULO_ACAO[a]}
                        </button>
                      )
                    })}
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => alternarModulo(m.id, m.acoes)}>
                    {m.acoes.every(a => sel.has(perm(m.id, a))) ? 'Limpar' : 'Tudo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="alert alert-w">
          <strong>Arquivar</strong> (botões vermelhos) permite enviar registros ao arquivo morto — mesmo assim, arquivar residente
          continua exigindo confirmação digitada e aprovação do Operador de Dados. Nada é apagado do banco em nenhuma hipótese.
        </div>

        <div className="form-actions">
          <button className="btn" onClick={() => setEditando(null)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar perfil'}</button>
        </div>
      </Modal>
    </div>
  )
}
