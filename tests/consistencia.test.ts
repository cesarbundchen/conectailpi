// Testes de CONSISTÊNCIA ESTRUTURAL — impedem que novos sprints
// reintroduzam as categorias de defeito encontradas nas auditorias de QA.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const raiz = join(__dirname, '..')
const ler = (p: string) => readFileSync(join(raiz, p), 'utf-8')
const sql = readdirSync(join(raiz, 'supabase/migrations')).sort()
  .map(f => ler(`supabase/migrations/${f}`)).join('\n')

describe('Consistência estrutural (anti-regressão das auditorias)', () => {
  it('D3: toda tabela com ilpi_id entra na exportação (backup completo de verdade)', () => {
    const exportar = ler('src/app/api/exportar/route.ts')
    const tabelas = [...sql.matchAll(/CREATE TABLE (\w+)([\s\S]*?)\);/g)]
      .filter(([, nome, corpo]) => corpo.includes('ilpi_id') && nome !== 'perfis')
      .map(([, nome]) => nome)
    for (const t of tabelas) {
      expect(exportar, `Tabela "${t}" tem dados da ILPI mas está fora do /api/exportar — adicione em TABELAS ou TABELAS_SO_ILPI`)
        .toContain(`'${t}'`)
    }
  })

  it('D2: escalas têm fonte única (tela e API importam de lib/escalas)', () => {
    expect(ler('src/app/api/avaliacoes/route.ts')).toContain("from '@/lib/escalas'")
    expect(ler('src/app/(protected)/avaliacoes/page.tsx')).toContain("from '@/lib/escalas'")
    // nenhuma redefinição local
    expect(ler('src/app/(protected)/avaliacoes/page.tsx')).not.toMatch(/const ESCALAS/)
  })

  it('RLS: toda tabela criada tem ENABLE ROW LEVEL SECURITY', () => {
    const criadas = [...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m => m[1])
    const comRls = new Set([...sql.matchAll(/ALTER TABLE (\w+)\s+ENABLE ROW LEVEL SECURITY/g)].map(m => m[1]))
    for (const t of criadas) expect(comRls.has(t), `Tabela "${t}" sem RLS`).toBe(true)
  })

  it('D1: telas com APIs restritas usam o gate usePapel', () => {
    for (const [pagina, gate] of [['financeiro', 'gestor'], ['dados', 'gestor'], ['dietas', 'clinico'], ['avaliacoes', 'clinico']] as const) {
      expect(ler(`src/app/(protected)/${pagina}/page.tsx`), `/${pagina} sem gate "${gate}"`).toContain(gate)
    }
  })

  it('D4: campos prometidos pela interface existem no schema', () => {
    // a tela de Cuidados promete meta ajustável; o schema e o prontuário precisam sustentar
    expect(sql).toContain('meta_hidratacao_ml')
    expect(ler('src/app/(protected)/residentes/[id]/page.tsx')).toContain('meta_hidratacao_ml')
  })
})
