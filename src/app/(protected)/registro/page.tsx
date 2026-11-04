'use client'
// Registro de Cuidados — a tela que a cuidadora usa o dia inteiro.
// Escolhe a residente, toca no tipo de evento, preenche o mínimo e salva.
// Sem menus, sem abas escondidas: tudo que pode acontecer com a idosa
// está a dois toques de distância.
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { usePermissoes } from '@/lib/usePermissoes'

type D = Record<string, any>

const TIPOS = [
  { id: 'medicacao', ic: '💊', rot: 'Medicação', cor: 'bg-info' },
  { id: 'pressao', ic: '🩺', rot: 'Pressão arterial', cor: 'bg-info' },
  { id: 'vomito', ic: '🤢', rot: 'Vômito', cor: 'bg-pendente' },
  { id: 'nausea', ic: '😣', rot: 'Náusea', cor: 'bg-pendente' },
  { id: 'tontura', ic: '💫', rot: 'Tontura', cor: 'bg-pendente' },
  { id: 'dor_barriga', ic: '🤕', rot: 'Dor de barriga', cor: 'bg-pendente' },
  { id: 'desmaio', ic: '🚨', rot: 'Desmaio', cor: 'bg-aberta' },
  { id: 'outro', ic: '➕', rot: 'Outro', cor: 'bg-inativa' },
] as const

export default function RegistroPage() {
  const [dados, setDados] = useState<D | null>(null)
  const [residente, setResidente] = useState<string>('')
  const [tipo, setTipo] = useState<string | null>(null)
  const [form, setForm] = useState<D>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const { carregado, pode } = usePermissoes()

  const carregar = useCallback(async () => {
    const r = await fetch('/api/registro-rapido')
    const j = await r.json()
    if (j.ok) setDados(j.dados); else toast(j.erro, 'erro')
  }, [toast])
  useEffect(() => { carregar() }, [carregar])

  const residentes: D[] = dados?.residentes ?? []
  const resSel = residentes.find(r => r.id === residente)
  const medsDaResidente: D[] = (dados?.medicamentos ?? []).filter((m: D) => m.residente_id === residente)
  const feedHoje = [
    ...(dados?.administracoesHoje ?? []).filter((x: D) => x.residente_id === residente).map((x: D) => ({
      hora: x.criado_em, texto: `💊 ${x.horario} — ${x.status}`, cor: x.status === 'Administrado' ? 'var(--verde)' : 'var(--amarelo)',
    })),
    ...(dados?.sinaisHoje ?? []).filter((x: D) => x.residente_id === residente).map((x: D) => ({
      hora: x.criado_em, texto: `🩺 ${x.sistolica}/${x.diastolica} mmHg${x.alerta ? ' ⚠ fora da faixa' : ''}`, cor: x.alerta ? 'var(--vermelho)' : 'var(--txt2)',
    })),
    ...(dados?.ocorrenciasHoje ?? []).filter((x: D) => x.residente_id === residente).map((x: D) => ({
      hora: x.criado_em, texto: `${x.tipo_ocorrencia} — ${x.status}`, cor: x.status === 'Aberta' ? 'var(--vermelho)' : 'var(--txt2)',
    })),
  ].sort((a, b) => (a.hora < b.hora ? 1 : -1))

  function abrirTipo(id: string) {
    setForm({})
    setTipo(id)
  }
  function fechar() { setTipo(null); setForm({}) }

  async function salvar(payload: D) {
    setSalvando(true)
    const r = await fetch('/api/registro-rapido', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residente_id: residente, ...payload }),
    })
    const j = await r.json()
    setSalvando(false)
    if (!j.ok) { toast(j.erro, 'erro'); return }
    if (j.dados.alerta || j.dados.urgente) {
      toast('Registrado — item de prioridade ALTA criado no plantão', 'info')
    } else {
      toast('Registrado ✓', 'ok')
    }
    fechar()
    carregar()
  }

  if (carregado && !pode('registro', 'ver')) {
    return <div className="alert alert-w">Seu perfil não tem acesso ao Registro de Cuidados.</div>
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Registro de Cuidados</h1>
      <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
        Escolha a residente, toque no que aconteceu e preencha o essencial.
      </div>

      {/* ── seletor de residente: chips grandes, uma mão só ── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {residentes.length === 0 && <div className="empty">Nenhuma residente ativa</div>}
          {residentes.map(r => (
            <button key={r.id}
              className={`btn ${residente === r.id ? 'btn-p' : ''}`}
              style={{ padding: '10px 16px', fontSize: 13 }}
              onClick={() => { setResidente(r.id); setTipo(null) }}>
              {r.nome.split(' ').slice(0, 2).join(' ')} <span style={{ opacity: .7, fontSize: 11 }}>Q.{r.quarto ?? '—'}</span>
            </button>
          ))}
        </div>
      </div>

      {!residente ? (
        <div className="alert alert-i">Toque em uma residente acima para começar.</div>
      ) : (
        <>
          {/* ── grade de tipos de evento ── */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">O que aconteceu com {resSel?.nome.split(' ')[0]}?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {TIPOS.map(t => (
                <button key={t.id} type="button"
                  onClick={() => abrirTipo(t.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 8px', borderRadius: 10, border: '1px solid var(--brd)',
                    background: t.id === 'desmaio' ? 'var(--vermelho-bg)' : '#fff', cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 26 }}>{t.ic}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{t.rot}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── feed do dia, para a cuidadora conferir o que já lançou ── */}
          <div className="card">
            <div className="card-title">📋 Hoje — {resSel?.nome.split(' ')[0]} ({feedHoje.length})</div>
            {feedHoje.length === 0 ? <div className="empty">Nada registrado ainda hoje</div> : (
              feedHoje.slice(0, 12).map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1EFE8', fontSize: 12 }}>
                  <span style={{ color: 'var(--txt3)', minWidth: 42 }}>{new Date(f.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: f.cor }}>{f.texto}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ══════════ formulários rápidos por tipo (modal simples) ══════════ */}
      {tipo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={fechar}>
          <div className="card" style={{ width: '100%', maxWidth: 480, margin: 0, borderRadius: '16px 16px 0 0', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            {tipo === 'medicacao' && (
              <FormMedicacao meds={medsDaResidente} onCancelar={fechar} onSalvar={salvar} salvando={salvando} />
            )}
            {tipo === 'pressao' && (
              <FormPressao onCancelar={fechar} onSalvar={salvar} salvando={salvando} />
            )}
            {tipo !== 'medicacao' && tipo !== 'pressao' && (
              <FormSintoma tipo={tipo} onCancelar={fechar} onSalvar={salvar} salvando={salvando} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══ Medicação: lista os ativos da residente, um toque para administrar ═══
function FormMedicacao({ meds, onCancelar, onSalvar, salvando }: { meds: D[]; onCancelar: () => void; onSalvar: (p: D) => void; salvando: boolean }) {
  return (
    <div>
      <div className="card-title" style={{ fontSize: 15 }}>💊 Medicação</div>
      {meds.length === 0 ? (
        <div className="empty">Nenhum medicamento ativo para esta residente</div>
      ) : meds.map(m => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #F1EFE8' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.nome_medicamento} {m.dosagem}{m.controlado && <span className="badge bg-aberta" style={{ marginLeft: 6 }}>Controlado</span>}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {(m.horarios ?? []).map((h: string) => (
              <button key={h} className="btn btn-s btn-sm" disabled={salvando}
                onClick={() => onSalvar({ tipo: 'medicacao', medicamento_id: m.id, horario: h, status: 'Administrado' })}>
                ✓ {h}
              </button>
            ))}
            <button className="btn btn-w btn-sm" disabled={salvando}
              onClick={() => onSalvar({ tipo: 'medicacao', medicamento_id: m.id, horario: new Date().toTimeString().slice(0, 5), status: 'Recusado' })}>
              Recusou
            </button>
          </div>
        </div>
      ))}
      <div className="form-actions"><button className="btn" onClick={onCancelar}>Fechar</button></div>
    </div>
  )
}

// ═══ Pressão arterial ═══
function FormPressao({ onCancelar, onSalvar, salvando }: { onCancelar: () => void; onSalvar: (p: D) => void; salvando: boolean }) {
  const [sist, setSist] = useState(''); const [diast, setDiast] = useState('')
  const [pulso, setPulso] = useState(''); const [obs, setObs] = useState('')
  const valido = Number(sist) > 0 && Number(diast) > 0
  return (
    <div>
      <div className="card-title" style={{ fontSize: 15 }}>🩺 Pressão arterial</div>
      <div className="alert alert-i">Aferição avulsa — quando necessário, fora da rotina prescrita.</div>
      <div className="form-grid">
        <div><label>Sistólica <span className="req">*</span></label><input type="number" inputMode="numeric" value={sist} onChange={e => setSist(e.target.value)} placeholder="Ex.: 120" /></div>
        <div><label>Diastólica <span className="req">*</span></label><input type="number" inputMode="numeric" value={diast} onChange={e => setDiast(e.target.value)} placeholder="Ex.: 80" /></div>
        <div><label>Pulso (opcional)</label><input type="number" inputMode="numeric" value={pulso} onChange={e => setPulso(e.target.value)} placeholder="bpm" /></div>
        <div className="full"><label>Observação</label><textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} /></div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-p" disabled={!valido || salvando}
          onClick={() => onSalvar({ tipo: 'pressao', sistolica: sist, diastolica: diast, pulso: pulso || null, observacao: obs || null })}>
          {salvando ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ═══ Sintomas: vômito, náusea, tontura, dor de barriga, desmaio, outro ═══
const ROTULOS: Record<string, string> = { vomito: 'Vômito', nausea: 'Náusea', tontura: 'Tontura', dor_barriga: 'Dor de barriga', desmaio: 'Desmaio', outro: 'Outro' }
function FormSintoma({ tipo, onCancelar, onSalvar, salvando }: { tipo: string; onCancelar: () => void; onSalvar: (p: D) => void; salvando: boolean }) {
  const [detalhes, setDetalhes] = useState('')
  const [outroLabel, setOutroLabel] = useState('')
  const [urgente, setUrgente] = useState(tipo === 'desmaio')
  const ehDesmaio = tipo === 'desmaio'
  return (
    <div>
      <div className="card-title" style={{ fontSize: 15 }}>{TIPOS.find(t => t.id === tipo)?.ic} {ROTULOS[tipo]}</div>
      {ehDesmaio && <div className="alert alert-d"><strong>Desmaio é sempre tratado como urgente</strong> — a equipe é avisada imediatamente pelo quadro de plantão.</div>}
      <div className="form-grid">
        {tipo === 'outro' && (
          <div className="full"><label>O que aconteceu? <span className="req">*</span></label>
            <input value={outroLabel} onChange={e => setOutroLabel(e.target.value)} placeholder="Descreva em poucas palavras" /></div>
        )}
        <div className="full"><label>Detalhes (opcional)</label>
          <textarea rows={3} value={detalhes} onChange={e => setDetalhes(e.target.value)} placeholder="Quando começou, intensidade, o que já foi feito..." /></div>
        {!ehDesmaio && (
          <div className="full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="urg" checked={urgente} onChange={e => setUrgente(e.target.checked)} style={{ width: 18, height: 18 }} />
            <label htmlFor="urg" style={{ margin: 0, fontSize: 13, color: 'var(--txt)' }}>Precisa de atenção agora (avisa a equipe no plantão)</label>
          </div>
        )}
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onCancelar}>Cancelar</button>
        <button className={`btn ${ehDesmaio ? 'btn-d' : 'btn-p'}`} disabled={salvando || (tipo === 'outro' && !outroLabel.trim())}
          onClick={() => onSalvar({ tipo, detalhes, outro_label: outroLabel, urgente })}>
          {salvando ? '...' : ehDesmaio ? '🚨 Registrar e avisar equipe' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
