'use client'
// Importar & Exportar — migração de controles manuais e portabilidade LGPD
import { useEffect, useState, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { usePapel } from '@/lib/usePapel'

type D = Record<string, any>

const MODELOS: Record<string, { rotulo: string; colunas: string[]; exemplo: string[] }> = {
  residentes: {
    rotulo: '1️⃣ Residentes',
    colunas: ['nome', 'data_nascimento', 'cpf', 'quarto', 'leito', 'data_admissao', 'grau_dependencia', 'status', 'observacoes'],
    exemplo: ['Maria da Silva', '1940-05-12', '111.222.333-44', '02', 'A', '2024-03-01', 'Nível II — dependência parcial', 'Ativa', 'Dieta hipossódica'],
  },
  responsaveis: {
    rotulo: '2️⃣ Responsáveis',
    colunas: ['residente_nome', 'nome', 'parentesco', 'tipo', 'telefone_principal', 'email'],
    exemplo: ['Maria da Silva', 'João da Silva', 'Filho', 'Ambos', '(85) 99999-0000', 'joao@email.com'],
  },
  medicamentos: {
    rotulo: '3️⃣ Medicamentos',
    colunas: ['residente_nome', 'nome_medicamento', 'dosagem', 'via', 'frequencia', 'horarios', 'medico_nome', 'controlado'],
    exemplo: ['Maria da Silva', 'Losartana', '50mg', 'Oral', '12/12h', '08:00; 20:00', 'Dr. Carlos Ponte', 'nao'],
  },
  financeiro: {
    rotulo: '4️⃣ Financeiro',
    colunas: ['residente_nome', 'mes', 'ano', 'mensalidade', 'extras', 'valor_pago', 'status'],
    exemplo: ['Maria da Silva', '7', '2026', '2500.00', '180.00', '0', 'Pendente'],
  },
}

// Parser CSV simples com suporte a aspas
function parseCSV(texto: string): string[][] {
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], dentro = false
  const t = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (dentro) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') dentro = false
      else campo += c
    } else if (c === '"') dentro = true
    else if (c === ',' || c === ';') { linha.push(campo); campo = '' }
    else if (c === '\n') { linha.push(campo); if (linha.some(x => x.trim())) linhas.push(linha); linha = []; campo = '' }
    else campo += c
  }
  if (campo || linha.length) { linha.push(campo); if (linha.some(x => x.trim())) linhas.push(linha) }
  return linhas
}

function baixar(nome: string, conteudo: string, tipo = 'text/csv') {
  const blob = new Blob(['\uFEFF' + conteudo], { type: tipo + ';charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = nome; a.click()
  URL.revokeObjectURL(a.href)
}

function paraCSV(linhas: Record<string, unknown>[]): string {
  if (!linhas.length) return ''
  const cols = Object.keys(linhas[0])
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  return cols.join(',') + '\n' + linhas.map(l => cols.map(c => esc(l[c])).join(',')).join('\n')
}

export default function DadosPage() {
  const [residentes, setResidentes] = useState<D[]>([])
  const [entidade, setEntidade] = useState('residentes')
  const [resExp, setResExp] = useState('')
  const [preview, setPreview] = useState<{ colunas: string[]; linhas: Record<string, string>[] } | null>(null)
  const [resultado, setResultado] = useState<D | null>(null)
  const [processando, setProcessando] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { gestor, carregado } = usePapel()

  useEffect(() => { fetch('/api/residentes').then(r => r.json()).then(j => { if (j.ok) setResidentes(j.dados) }) }, [])

  function baixarModelo(ent: string) {
    const m = MODELOS[ent]
    baixar(`modelo_${ent}.csv`, m.colunas.join(',') + '\n' + m.exemplo.map(v => /[",;]/.test(v) ? '"' + v + '"' : v).join(','))
    toast('Modelo baixado — preencha e envie de volta', 'ok')
  }

  function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const leitor = new FileReader()
    leitor.onload = () => {
      const grade = parseCSV(String(leitor.result))
      if (grade.length < 2) { toast('Arquivo vazio ou sem linhas de dados', 'erro'); return }
      const cab = grade[0].map(c => c.trim().toLowerCase())
      const esperadas = MODELOS[entidade].colunas
      const faltando = esperadas.filter(c => !cab.includes(c))
      if (faltando.length) { toast(`Colunas faltando: ${faltando.join(', ')}. Use o modelo.`, 'erro'); return }
      const linhas = grade.slice(1).map(l => {
        const o: Record<string, string> = {}
        cab.forEach((c, i) => { o[c] = (l[i] ?? '').trim() })
        return o
      })
      setPreview({ colunas: esperadas, linhas })
      setResultado(null)
    }
    leitor.readAsText(f)
  }

  async function importar() {
    if (!preview) return
    setProcessando(true)
    const r = await fetch('/api/importar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entidade, linhas: preview.linhas }),
    })
    const j = await r.json(); setProcessando(false)
    if (j.ok) {
      setResultado(j.dados); setPreview(null)
      if (arquivoRef.current) arquivoRef.current.value = ''
      toast(`${j.dados.importadas} linhas importadas`, j.dados.erros.length ? 'info' : 'ok')
    } else toast(j.erro, 'erro')
  }

  async function exportar(escopo: 'ilpi' | 'residente', formato: 'json' | 'csv') {
    if (escopo === 'residente' && !resExp) { toast('Escolha a residente', 'erro'); return }
    setProcessando(true)
    const q = escopo === 'residente' ? `?escopo=residente&residente_id=${resExp}` : '?escopo=ilpi'
    const r = await fetch(`/api/exportar${q}`)
    const j = await r.json(); setProcessando(false)
    if (!j.ok) { toast(j.erro, 'erro'); return }
    const d = j.dados
    const nomeBase = escopo === 'ilpi' ? 'careilpi_backup_completo' : `prontuario_${(residentes.find(x => x.id === resExp)?.nome ?? 'residente').replace(/\s+/g, '_')}`
    const data = new Date().toISOString().split('T')[0]
    if (formato === 'json') {
      baixar(`${nomeBase}_${data}.json`, JSON.stringify(d, null, 2), 'application/json')
    } else {
      // Um CSV por tabela não-vazia, baixados em sequência
      const tabelas = Object.keys(d).filter(k => Array.isArray(d[k]) && d[k].length > 0)
      for (const t of tabelas) baixar(`${nomeBase}_${t}_${data}.csv`, paraCSV(d[t]))
      toast(`${tabelas.length} arquivos CSV baixados`, 'ok')
    }
    toast('Exportação concluída — registrada no histórico', 'ok')
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Importar & Exportar dados</h1>
      {carregado && !gestor && <div className="alert alert-w">Importação e exportação de dados são restritas a admin e coordenador(a), por envolverem dados pessoais em massa (LGPD).</div>}

      {/* ── IMPORTAÇÃO ── */}
      <div className="card">
        <div className="card-title">📥 Importar dados (migração dos controles manuais)</div>
        <div className="alert alert-i">
          Fluxo: <strong>1)</strong> baixe a planilha-modelo · <strong>2)</strong> preencha no Excel/Google Sheets com os dados dos controles atuais · <strong>3)</strong> salve como CSV · <strong>4)</strong> envie aqui.
          Importe na ordem: Residentes primeiro, depois os vínculos.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(MODELOS).map(([k, m]) => (
            <button key={k} className="btn btn-sm" onClick={() => baixarModelo(k)}>⬇ Modelo {m.rotulo}</button>
          ))}
        </div>
        <div className="form-grid">
          <div>
            <label>O que você está importando?</label>
            <select value={entidade} onChange={e => { setEntidade(e.target.value); setPreview(null) }}>
              {Object.entries(MODELOS).map(([k, m]) => <option key={k} value={k}>{m.rotulo}</option>)}
            </select>
          </div>
          <div>
            <label>Arquivo CSV preenchido</label>
            <input type="file" accept=".csv,text/csv" ref={arquivoRef} onChange={lerArquivo} />
          </div>
        </div>

        {preview && (
          <div style={{ marginTop: 12 }}>
            <div className="alert alert-w"><strong>Conferência:</strong> {preview.linhas.length} linhas prontas. Revise as 5 primeiras antes de confirmar.</div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr>{preview.colunas.map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {preview.linhas.slice(0, 5).map((l, i) => (
                    <tr key={i}>{preview.colunas.map(c => <td key={c} style={{ fontSize: 11 }}>{l[c] || '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => { setPreview(null); if (arquivoRef.current) arquivoRef.current.value = '' }}>Cancelar</button>
              <button className="btn btn-p" onClick={importar} disabled={processando || !gestor}>
                {processando ? 'Importando...' : `✓ Importar ${preview.linhas.length} linhas`}
              </button>
            </div>
          </div>
        )}

        {resultado && (
          <div style={{ marginTop: 12 }}>
            <div className={`alert ${resultado.erros.length ? 'alert-w' : 'alert-s'}`}>
              <strong>{resultado.importadas} linhas importadas com sucesso.</strong>
              {resultado.erros.length > 0 && ` ${resultado.erros.length} linhas com erro:`}
            </div>
            {resultado.erros.slice(0, 10).map((e: D) => (
              <div key={e.linha} style={{ fontSize: 11, color: 'var(--vermelho)', padding: '2px 0' }}>Linha {e.linha}: {e.erro}</div>
            ))}
          </div>
        )}
      </div>

      {/* ── EXPORTAÇÃO ── */}
      <div className="card">
        <div className="card-title">📤 Exportar dados (backup e portabilidade LGPD)</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ border: '1px solid var(--brd)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>👤 Uma residente</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 8 }}>
              Prontuário completo: dados, medicamentos, ocorrências, atendimentos, financeiro, documentos, responsáveis e histórico. Para transferência, família ou arquivamento.
            </div>
            <select value={resExp} onChange={e => setResExp(e.target.value)} style={{ marginBottom: 8 }}>
              <option value="">Escolha a residente...</option>
              {residentes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-p btn-sm" onClick={() => exportar('residente', 'json')} disabled={processando || !gestor}>⬇ JSON completo</button>
              <button className="btn btn-sm" onClick={() => exportar('residente', 'csv')} disabled={processando || !gestor}>⬇ Planilhas CSV</button>
            </div>
          </div>

          <div style={{ border: '1px solid var(--brd)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🏥 Instituição completa</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 8 }}>
              TODOS os dados de todas as residentes + equipe + histórico. Backup integral: seus dados nunca ficam presos no sistema.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 26 }}>
              <button className="btn btn-p btn-sm" onClick={() => exportar('ilpi', 'json')} disabled={processando || !gestor}>⬇ JSON completo</button>
              <button className="btn btn-sm" onClick={() => exportar('ilpi', 'csv')} disabled={processando || !gestor}>⬇ Planilhas CSV</button>
            </div>
          </div>
        </div>

        <div className="alert alert-i" style={{ marginTop: 10 }}>
          <strong>JSON</strong> = backup fiel, reimportável no futuro. <strong>CSV</strong> = um arquivo por módulo, abre no Excel.
          Toda exportação fica registrada no histórico de auditoria (quem exportou e quando).
        </div>
      </div>
    </div>
  )
}
