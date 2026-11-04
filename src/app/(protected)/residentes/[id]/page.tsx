'use client'
// Prontuário da residente — 7 abas + editar + registrar saída
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import type { ProntuarioCompleto } from '@/types/database'

const ABAS = ['Dados gerais', 'Medicamentos', 'Ocorrências', 'Atendimentos', 'Financeiro', 'Documentos', 'Responsáveis']

export default function ProntuarioPage() {
  const { id } = useParams<{ id: string }>()
  const [p, setP] = useState<ProntuarioCompleto | null>(null)
  const [aba, setAba] = useState(0)
  const [mEdit, setMEdit] = useState(false)
  const [mSaida, setMSaida] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saida, setSaida] = useState<Record<string, string>>({ tipo_saida: 'Alta' })
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/residentes/${id}`)
    const j = await r.json()
    if (j.ok) setP(j.dados)
    else toast('Erro ao carregar prontuário', 'erro')
  }, [id, toast])

  useEffect(() => { carregar() }, [carregar])

  if (!p) return <div className="empty">Carregando prontuário...</div>
  const r = p.residente
  const fdt = (d: string | null) => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
  const brl = (v: number) => 'R$ ' + (v ?? 0).toFixed(2).replace('.', ',')

  function abrirEditar() {
    setForm({
      nome: r.nome ?? '', cpf: r.cpf ?? '', quarto: r.quarto ?? '', leito: r.leito ?? '',
      grau_dependencia: r.grau_dependencia ?? '', observacoes: r.observacoes ?? '',
      meta_hidratacao_ml: String(r.meta_hidratacao_ml ?? 1500),
      data_nascimento: r.data_nascimento ?? '', estado_civil: r.estado_civil ?? '',
    })
    setMEdit(true)
  }

  async function salvarEdicao() {
    setSalvando(true)
    const resp = await fetch(`/api/residentes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, meta_hidratacao_ml: Number(form.meta_hidratacao_ml) || 1500 }),
    })
    const j = await resp.json()
    setSalvando(false)
    if (j.ok) { toast('Dados atualizados', 'ok'); setMEdit(false); carregar() }
    else toast(j.erro ?? 'Erro ao salvar', 'erro')
  }

  async function confirmarSaida() {
    if (!saida.tipo_saida || !saida.data_saida) { toast('Preencha tipo e data', 'erro'); return }
    setSalvando(true)
    const resp = await fetch('/api/saidas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...saida, residente_id: id }),
    })
    const j = await resp.json()
    setSalvando(false)
    if (j.ok) { toast(`Saída registrada — status: ${j.dados.novoStatus}`, 'ok'); setMSaida(false); carregar() }
    else toast(j.erro ?? 'Erro ao registrar saída', 'erro')
  }

  const inp = (k: string, form2: Record<string, string>, set2: (f: Record<string, string>) => void) =>
    ({ value: form2[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set2({ ...form2, [k]: e.target.value }) })

  return (
    <div>
      {/* Cabeçalho */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div className="av" style={{ width: 52, height: 52, fontSize: 17 }}>
          {r.nome.split(' ').map((x: string, i: number, a: string[]) => i === 0 || i === a.length - 1 ? x[0] : '').join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{r.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)' }}>
            Q.{r.quarto ?? '—'} / L.{r.leito ?? '—'} · Admissão: {fdt(r.data_admissao)} · {r.grau_dependencia ?? 'Sem classificação'}
          </div>
        </div>
        <Badge status={r.status} />
        <button className="btn" onClick={abrirEditar}>✏️ Editar</button>
        {(r.status === 'Ativa' || r.status === 'Ausente') && (
          <button className="btn btn-w" onClick={() => { setSaida({ tipo_saida: 'Alta', data_saida: new Date().toISOString().split('T')[0] }); setMSaida(true) }}>
            Registrar saída
          </button>
        )}
      </div>

      {/* Restrições em destaque */}
      {p.restricoes.filter(x => x.status === 'Ativa').length > 0 && (
        <div className="alert alert-d">
          <strong>⚠ Restrições ativas:</strong>{' '}
          {p.restricoes.filter(x => x.status === 'Ativa').map(x => `${x.tipo}: ${x.descricao}`).join(' · ')}
        </div>
      )}

      {/* Abas */}
      <div className="tabs">
        {ABAS.map((a, i) => (
          <button key={a} className={`tab ${aba === i ? 'on' : ''}`} onClick={() => setAba(i)}>
            {a}{i > 0 && ` (${[p.medicamentos, p.ocorrencias, p.atendimentos, p.financeiro, p.documentos, p.responsaveis][i - 1]?.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Aba 0 — Dados gerais */}
      {aba === 0 && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '6px 20px', fontSize: 12 }}>
            {[
              ['Nome social', r.nome_social], ['Nascimento', fdt(r.data_nascimento)], ['CPF', r.cpf], ['RG', r.rg],
              ['Naturalidade', r.naturalidade], ['Estado civil', r.estado_civil], ['Religião', r.religiao],
              ['Escolaridade', r.escolaridade], ['Profissão anterior', r.profissao],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #F1EFE8' }}>
                <span style={{ color: 'var(--txt3)', width: 120, flexShrink: 0 }}>{l}</span>
                <span style={{ fontWeight: 500 }}>{(v as string) ?? '—'}</span>
              </div>
            ))}
          </div>
          {r.observacoes && <div className="alert alert-i" style={{ marginTop: 12 }}><strong>Observações:</strong> {r.observacoes}</div>}
        </div>
      )}

      {/* Aba 1 — Medicamentos */}
      {aba === 1 && (
        <div className="card">
          {p.medicamentos.length === 0 ? <div className="empty">Nenhum medicamento cadastrado</div> :
            p.medicamentos.map(m => (
              <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{m.nome_medicamento} {m.dosagem}</strong>
                  {m.controlado && <span className="badge bg-aberta">Controlado</span>}
                  <Badge status={m.status} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>
                  {m.via} · {m.frequencia} · Dr. {m.medico_nome ?? '—'}
                </div>
                <div style={{ marginTop: 4 }}>
                  {(m.horarios ?? []).map(h => <span key={h} className="badge bg-info" style={{ marginRight: 4 }}>{h}</span>)}
                </div>
              </div>
            ))}
          <div className="alert alert-i" style={{ marginTop: 10 }}>Gestão completa de medicamentos no módulo Medicamentos (Sprint 2).</div>
        </div>
      )}

      {/* Aba 2 — Ocorrências */}
      {aba === 2 && (
        <div className="card">
          {p.ocorrencias.length === 0 ? <div className="empty">Nenhuma ocorrência registrada</div> :
            p.ocorrencias.map(o => (
              <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{o.tipo_ocorrencia}</strong>
                  <Badge status={o.status} />
                  <span style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 'auto' }}>{new Date(o.data_hora).toLocaleString('pt-BR')}</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 3 }}>{o.descricao}</div>
                {o.acao_imediata && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>Ação: {o.acao_imediata}</div>}
              </div>
            ))}
        </div>
      )}

      {/* Aba 3 — Atendimentos */}
      {aba === 3 && (
        <div className="card">
          {p.atendimentos.length === 0 ? <div className="empty">Nenhum atendimento registrado</div> :
            p.atendimentos.map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{a.tipo_atendimento}</strong>
                  <span style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 'auto' }}>{new Date(a.data_hora).toLocaleString('pt-BR')}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Dr. {a.medico_nome ?? '—'} {a.cid10 && `· CID ${a.cid10}`}</div>
                {a.diagnostico && <div style={{ fontSize: 12, marginTop: 2 }}>{a.diagnostico}</div>}
              </div>
            ))}
        </div>
      )}

      {/* Aba 4 — Financeiro */}
      {aba === 4 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {p.financeiro.length === 0 ? <div className="empty">Nenhum lançamento</div> : (
            <table>
              <thead><tr><th>Competência</th><th>Mensalidade</th><th>Extras</th><th>Pago</th><th>Status</th></tr></thead>
              <tbody>
                {p.financeiro.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{String(f.mes).padStart(2, '0')}/{f.ano}</td>
                    <td>{brl(f.mensalidade)}</td>
                    <td>{brl(f.extras)}</td>
                    <td>{brl(f.valor_pago)}{f.data_pagamento && <span style={{ fontSize: 10, color: 'var(--txt3)' }}> em {fdt(f.data_pagamento)}</span>}</td>
                    <td><Badge status={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Aba 5 — Documentos */}
      {aba === 5 && (
        <div className="card">
          {p.documentos.length === 0 ? <div className="empty">Nenhum documento</div> :
            p.documentos.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--azul-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--azul-esc)' }}>
                  {d.tipo.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{d.nome}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{d.tipo} · {fdt(d.data_documento)}</div>
                </div>
                <Badge status={d.status} />
                {d.drive_url && <a href={d.drive_url} target="_blank" rel="noopener" className="btn btn-sm">Abrir ↗</a>}
              </div>
            ))}
        </div>
      )}

      {/* Aba 6 — Responsáveis */}
      {aba === 6 && (
        <div className="card">
          {p.responsaveis.length === 0 ? <div className="empty">Nenhum responsável cadastrado</div> :
            p.responsaveis.map(x => (
              <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div className="av" style={{ width: 34, height: 34, fontSize: 11 }}>
                  {x.nome.split(' ').map((w: string, i: number, a: string[]) => i === 0 || i === a.length - 1 ? w[0] : '').join('').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{x.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
                    {x.parentesco ?? '—'} · {x.telefone_principal ?? '—'} · {x.tipo ?? 'Familiar'}
                    {x.autorizado_retirada && ' · ✓ Autorizado retirada'}
                  </div>
                </div>
              </div>
            ))}
          {r.portal_token && (
            <div className="alert alert-s" style={{ marginTop: 10 }}>
              <strong>Portal da família:</strong> /portal/{r.portal_token}
            </div>
          )}
        </div>
      )}

      {/* Modal editar */}
      <Modal aberto={mEdit} titulo="Editar dados da residente" onFechar={() => setMEdit(false)}>
        <div className="form-grid">
          <div className="full"><label>Nome completo <span className="req">*</span></label><input {...inp('nome', form, setForm)} /></div>
          <div><label>Nascimento</label><input type="date" {...inp('data_nascimento', form, setForm)} /></div>
          <div><label>CPF</label><input {...inp('cpf', form, setForm)} /></div>
          <div><label>Estado civil</label>
            <select {...inp('estado_civil', form, setForm)}>
              <option value="">—</option>{['Solteira', 'Casada', 'Viúva', 'Divorciada'].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div><label>Quarto</label><input {...inp('quarto', form, setForm)} /></div>
          <div><label>Leito</label><input {...inp('leito', form, setForm)} /></div>
          <div><label>Meta de hidratação (ml/dia)</label>
            <input type="number" min={200} max={4000} {...inp('meta_hidratacao_ml', form, setForm)} /></div>
          <div><label>Grau de dependência</label>
            <select {...inp('grau_dependencia', form, setForm)}>
              <option value="">—</option>
              <option>Nível I — independente</option>
              <option>Nível II — dependência parcial</option>
              <option>Nível III — dependência total</option>
            </select>
          </div>
          <div className="full"><label>Observações</label><textarea {...inp('observacoes', form, setForm)} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMEdit(false)}>Cancelar</button>
          <button className="btn btn-p" onClick={salvarEdicao} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      {/* Modal saída */}
      <Modal aberto={mSaida} titulo="Registrar saída da residente" onFechar={() => setMSaida(false)} larguraMax={520}>
        <div className="alert alert-w">Esta ação altera o status da residente. O histórico é preservado permanentemente.</div>
        <div className="form-grid">
          <div><label>Tipo de saída <span className="req">*</span></label>
            <select {...inp('tipo_saida', saida, setSaida)}>
              <option>Alta</option><option>Transferência</option><option value="Obito">Óbito</option>
            </select>
          </div>
          <div><label>Data <span className="req">*</span></label><input type="date" {...inp('data_saida', saida, setSaida)} /></div>
          <div className="full"><label>Motivo / destino</label><input {...inp('motivo', saida, setSaida)} /></div>
          {saida.tipo_saida === 'Obito' && (<>
            <div><label>Médico atestante</label><input {...inp('medico_atestante', saida, setSaida)} /></div>
            <div><label>Causa (atestado)</label><input {...inp('causa_obito', saida, setSaida)} /></div>
          </>)}
          <div className="full"><label>Observações</label><textarea {...inp('observacoes', saida, setSaida)} /></div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setMSaida(false)}>Cancelar</button>
          <button className="btn btn-d" onClick={confirmarSaida} disabled={salvando}>{salvando ? 'Registrando...' : 'Confirmar saída'}</button>
        </div>
      </Modal>
    </div>
  )
}
