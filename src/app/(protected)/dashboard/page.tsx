// Painel — Server Component: dados carregados no servidor
import { getAuthenticatedUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import Icone, { type NomeIcone } from '@/components/ui/Icone'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function saudacao() {
  const h = Number(new Date().toLocaleString('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Fortaleza' }))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Kpi({ valor, rotulo, icone, cor, fundo }: { valor: number; rotulo: string; icone: NomeIcone; cor: string; fundo: string }) {
  return (
    <div className="met">
      <span className="met-ico" style={{ background: fundo, color: cor }}><Icone nome={icone} tamanho={20} /></span>
      <div className="met-v" style={{ color: cor }}>{valor}</div>
      <div className="met-l">{rotulo}</div>
    </div>
  )
}

export default async function DashboardPage() {
  const { perfil, ilpi_id } = await getAuthenticatedUser()
  const sb = createServerSupabase()
  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const [residentes, ocorrencias, medicamentos, financeiro] = await Promise.all([
    sb.from('residentes').select('id,nome,status,quarto,grau_dependencia').eq('ilpi_id', ilpi_id).order('nome'),
    sb.from('ocorrencias').select('id,tipo_ocorrencia,status,data_hora').eq('ilpi_id', ilpi_id).eq('arquivado', false).order('criado_em', { ascending: false }).limit(5),
    sb.from('medicamentos').select('id').eq('ilpi_id', ilpi_id).eq('status', 'Ativo').eq('arquivado', false),
    sb.from('financeiro').select('status').eq('ilpi_id', ilpi_id).eq('mes', mes).eq('ano', ano).eq('arquivado', false),
  ])

  const ativas = (residentes.data ?? []).filter(r => r.status === 'Ativa')
  const ocAb = (ocorrencias.data ?? []).filter(o => o.status === 'Aberta')
  const inadimp = (financeiro.data ?? []).filter(f => f.status === 'Atrasado').length
  const primeiroNome = (perfil.nome ?? '').trim().split(/\s+/)[0]

  return (
    <div>
      <section className="hero">
        <h1>{saudacao()}, {primeiroNome}.</h1>
        <p>Este é o resumo de hoje da sua instituição.</p>
        <div className="atalhos">
          <Link href="/registro" className="atalho destaque"><Icone nome="registro" tamanho={16} /> Registrar cuidado</Link>
          <Link href="/medicamentos" className="atalho"><Icone nome="medicamentos" tamanho={16} /> Medicamentos</Link>
          <Link href="/plantao" className="atalho"><Icone nome="plantao" tamanho={16} /> Plantão</Link>
          <Link href="/admissao" className="atalho"><Icone nome="admissao" tamanho={16} /> Nova admissão</Link>
        </div>
      </section>

      <div className="mets">
        <Kpi valor={ativas.length} rotulo="Residentes ativas" icone="residentes" cor="var(--azul)" fundo="var(--azul-bg)" />
        <Kpi valor={ocAb.length} rotulo="Ocorrências abertas" icone="ocorrencias"
          cor={ocAb.length ? 'var(--vermelho)' : 'var(--verde)'} fundo={ocAb.length ? 'var(--vermelho-bg)' : 'var(--verde-bg)'} />
        <Kpi valor={medicamentos.data?.length ?? 0} rotulo="Medicamentos ativos" icone="medicamentos" cor="var(--verde)" fundo="var(--verde-bg)" />
        <Kpi valor={inadimp} rotulo="Inadimplentes no mês" icone="financeiro"
          cor={inadimp ? 'var(--amarelo)' : 'var(--verde)'} fundo={inadimp ? 'var(--amarelo-bg)' : 'var(--verde-bg)'} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <Icone nome="residentes" tamanho={18} style={{ color: 'var(--turquesa)' }} /> Residentes ativas
            <Link href="/residentes" className="spacer" style={{ fontSize: 12, fontWeight: 800, color: 'var(--turquesa-txt)', textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          {ativas.length === 0 ? <div className="empty">Nenhuma residente cadastrada</div> :
            ativas.slice(0, 8).map(r => (
              <Link key={r.id} href={`/residentes/${r.id}`} className="lista-item">
                <div className="av" style={{ width: 36, height: 36, fontSize: 12 }}>{r.nome.split(' ').map((p: string, i: number, a: string[]) => i === 0 || i === a.length - 1 ? p[0] : '').join('').toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Quarto {r.quarto ?? '—'} · {r.grau_dependencia ?? '—'}</div>
                </div>
                <Badge status={r.status} />
              </Link>
            ))}
        </div>
        <div className="card">
          <div className="card-title">
            <Icone nome="ocorrencias" tamanho={18} style={{ color: 'var(--laranja)' }} /> Ocorrências recentes
            <Link href="/ocorrencias" className="spacer" style={{ fontSize: 12, fontWeight: 800, color: 'var(--turquesa-txt)', textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          {(ocorrencias.data ?? []).length === 0 ? <div className="empty">Nenhuma ocorrência registrada</div> :
            (ocorrencias.data ?? []).map(o => (
              <div key={o.id} className="lista-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{o.tipo_ocorrencia}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt3)' }}>{new Date(o.data_hora).toLocaleString('pt-BR')}</div>
                </div>
                <Badge status={o.status} />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
