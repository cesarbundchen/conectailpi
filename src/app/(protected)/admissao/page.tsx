'use client'
// Admissão de nova residente — stepper de 7 etapas
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

const ETAPAS = ['Triagem', 'Dados', 'Responsáveis', 'Clínica', 'Medicamentos', 'Contrato', 'Ativação']
type F = Record<string, string>

export default function AdmissaoPage() {
  const [etapa, setEtapa] = useState(0)
  const [res, setRes] = useState<F>({ status: 'Triagem' })
  const [resp, setResp] = useState<F>({})
  const [rest, setRest] = useState<F>({})
  const [med, setMed] = useState<F>({})
  const [fin, setFin] = useState<F>({})
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const inp = (k: string, f: F, set: (x: F) => void) =>
    ({ value: f[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set({ ...f, [k]: e.target.value }) })

  async function concluir() {
    if (!res.nome) { toast('Nome é obrigatório', 'erro'); setEtapa(1); return }
    setSalvando(true)
    try {
      // 1. Criar residente
      const r1 = await fetch('/api/residentes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...res, status: 'Ativa', data_admissao: res.data_admissao || new Date().toISOString().split('T')[0] }),
      })
      const j1 = await r1.json()
      if (!j1.ok) throw new Error(j1.erro)
      const rid = j1.dados.id

      // 2. Sub-cadastros opcionais em paralelo
      const subs: Promise<Response>[] = []
      const post = (url: string, body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (resp.nome) subs.push(post('/api/responsaveis', { ...resp, residente_id: rid }))
      if (rest.descricao) subs.push(post('/api/restricoes', { ...rest, tipo: rest.tipo || 'Alergia', gravidade: rest.gravidade || 'Alta', residente_id: rid }))
      if (med.nome_medicamento) subs.push(post('/api/medicamentos', { ...med, horarios: med.horarios ? med.horarios.split(',').map(h => h.trim()) : [], residente_id: rid }))
      if (fin.mensalidade) {
        const hoje = new Date()
        subs.push(post('/api/financeiro', { residente_id: rid, mes: hoje.getMonth() + 1, ano: hoje.getFullYear(), mensalidade: Number(fin.mensalidade), status: 'Pendente' }))
      }
      await Promise.all(subs)

      toast('Admissão concluída com sucesso!', 'ok')
      router.push(`/residentes/${rid}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na admissão', 'erro')
      setSalvando(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Nova admissão</h1>

      <div className="steps">
        {ETAPAS.map((e, i) => (
          <div key={e} className={`step ${i === etapa ? 'on' : i < etapa ? 'done' : ''}`} onClick={() => setEtapa(i)}>
            <span className="step-num">{i < etapa ? '✓' : i + 1}</span>{e}
          </div>
        ))}
      </div>

      <div className="card">
        {etapa === 0 && (<>
          <div className="card-title">Triagem inicial</div>
          <div className="alert alert-i">Registre a solicitação de vaga. A residente ficará com status <strong>Triagem</strong> até a ativação final.</div>
          <div className="form-grid">
            <div className="full"><label>Nome da idosa <span className="req">*</span></label><input {...inp('nome', res, setRes)} /></div>
            <div><label>Data de nascimento</label><input type="date" {...inp('data_nascimento', res, setRes)} /></div>
            <div><label>Grau de dependência (avaliação inicial)</label>
              <select {...inp('grau_dependencia', res, setRes)}>
                <option value="">—</option>
                <option>Nível I — independente</option>
                <option>Nível II — dependência parcial</option>
                <option>Nível III — dependência total</option>
              </select>
            </div>
          </div>
        </>)}

        {etapa === 1 && (<>
          <div className="card-title">Dados pessoais completos</div>
          <div className="form-grid">
            <div><label>CPF</label><input {...inp('cpf', res, setRes)} /></div>
            <div><label>RG</label><input {...inp('rg', res, setRes)} /></div>
            <div><label>Naturalidade</label><input {...inp('naturalidade', res, setRes)} /></div>
            <div><label>Estado civil</label>
              <select {...inp('estado_civil', res, setRes)}><option value="">—</option>{['Solteira', 'Casada', 'Viúva', 'Divorciada'].map(x => <option key={x}>{x}</option>)}</select>
            </div>
            <div><label>Religião</label><input {...inp('religiao', res, setRes)} /></div>
            <div><label>Escolaridade</label><input {...inp('escolaridade', res, setRes)} /></div>
            <div><label>Profissão anterior</label><input {...inp('profissao', res, setRes)} /></div>
          </div>
        </>)}

        {etapa === 2 && (<>
          <div className="card-title">Responsável principal</div>
          <div className="form-grid">
            <div className="full"><label>Nome do responsável</label><input {...inp('nome', resp, setResp)} /></div>
            <div><label>Parentesco</label><input {...inp('parentesco', resp, setResp)} placeholder="Filha, sobrinho..." /></div>
            <div><label>Tipo</label>
              <select {...inp('tipo', resp, setResp)}><option>Familiar</option><option>Financeiro</option><option>Ambos</option></select>
            </div>
            <div><label>Telefone principal</label><input {...inp('telefone_principal', resp, setResp)} /></div>
            <div><label>E-mail</label><input type="email" {...inp('email', resp, setResp)} /></div>
          </div>
          <div className="alert alert-i" style={{ marginTop: 10 }}>Outros responsáveis podem ser adicionados depois pelo prontuário.</div>
        </>)}

        {etapa === 3 && (<>
          <div className="card-title">Avaliação clínica — restrição principal</div>
          <div className="form-grid">
            <div><label>Tipo de restrição</label>
              <select {...inp('tipo', rest, setRest)}><option value="">Nenhuma</option><option>Alergia</option><option>Restrição alimentar</option><option>Mobilidade</option><option>Outra</option></select>
            </div>
            <div><label>Gravidade</label>
              <select {...inp('gravidade', rest, setRest)}><option>Alta</option><option>Média</option><option>Baixa</option></select>
            </div>
            <div className="full"><label>Descrição</label><input {...inp('descricao', rest, setRest)} placeholder="Ex.: alergia a dipirona" /></div>
          </div>
        </>)}

        {etapa === 4 && (<>
          <div className="card-title">Medicamento inicial (se houver prescrição)</div>
          <div className="form-grid">
            <div className="full"><label>Nome do medicamento</label><input {...inp('nome_medicamento', med, setMed)} /></div>
            <div><label>Dosagem</label><input {...inp('dosagem', med, setMed)} placeholder="500mg" /></div>
            <div><label>Via</label>
              <select {...inp('via', med, setMed)}><option value="">—</option><option>Oral</option><option>Tópica</option><option>Injetável</option><option>Inalatória</option></select>
            </div>
            <div><label>Horários (separados por vírgula)</label><input {...inp('horarios', med, setMed)} placeholder="08:00, 20:00" /></div>
            <div><label>Médico prescritor</label><input {...inp('medico_nome', med, setMed)} /></div>
          </div>
          <div className="alert alert-i" style={{ marginTop: 10 }}>A prescrição completa é gerenciada no módulo Medicamentos.</div>
        </>)}

        {etapa === 5 && (<>
          <div className="card-title">Contrato e acomodação</div>
          <div className="form-grid">
            <div><label>Quarto</label><input {...inp('quarto', res, setRes)} /></div>
            <div><label>Leito</label><input {...inp('leito', res, setRes)} /></div>
            <div><label>Data de admissão</label><input type="date" {...inp('data_admissao', res, setRes)} /></div>
            <div><label>Mensalidade (R$)</label><input type="number" {...inp('mensalidade', fin, setFin)} placeholder="2500.00" /></div>
            <div className="full"><label>Observações do contrato</label><textarea {...inp('observacoes', res, setRes)} /></div>
          </div>
        </>)}

        {etapa === 6 && (<>
          <div className="card-title">Revisão e ativação</div>
          <div className="alert alert-s">Ao concluir, a residente é criada com status <strong>Ativa</strong>, o portal da família é gerado automaticamente e todos os cadastros abaixo são gravados.</div>
          <table>
            <tbody>
              <tr><td style={{ color: 'var(--txt3)', width: 160 }}>Residente</td><td style={{ fontWeight: 600 }}>{res.nome || '— (obrigatório)'}</td></tr>
              <tr><td style={{ color: 'var(--txt3)' }}>Acomodação</td><td>Q.{res.quarto || '—'} / L.{res.leito || '—'}</td></tr>
              <tr><td style={{ color: 'var(--txt3)' }}>Responsável</td><td>{resp.nome || '—'}</td></tr>
              <tr><td style={{ color: 'var(--txt3)' }}>Restrição</td><td>{rest.descricao ? `${rest.tipo || 'Alergia'}: ${rest.descricao}` : '—'}</td></tr>
              <tr><td style={{ color: 'var(--txt3)' }}>Medicamento</td><td>{med.nome_medicamento ? `${med.nome_medicamento} ${med.dosagem ?? ''}` : '—'}</td></tr>
              <tr><td style={{ color: 'var(--txt3)' }}>Mensalidade</td><td>{fin.mensalidade ? `R$ ${fin.mensalidade}` : '—'}</td></tr>
            </tbody>
          </table>
        </>)}

        <div className="form-actions">
          {etapa > 0 && <button className="btn" onClick={() => setEtapa(etapa - 1)}>← Voltar</button>}
          {etapa < 6 && <button className="btn btn-p" onClick={() => setEtapa(etapa + 1)}>Avançar →</button>}
          {etapa === 6 && <button className="btn btn-s" onClick={concluir} disabled={salvando}>{salvando ? 'Concluindo...' : '✓ Concluir admissão'}</button>}
        </div>
      </div>
    </div>
  )
}
