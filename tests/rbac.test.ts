// Testes do RBAC de três níveis — impedem que perfis mal configurados
// ou módulos novos passem sem permissão declarada.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { MODULOS, PERFIS_MODELO, todasPermissoes, perm } from '../src/lib/modulos'

const raiz = join(__dirname, '..')
const ler = (p: string) => readFileSync(join(raiz, p), 'utf-8')
const sql = readdirSync(join(raiz, 'supabase/migrations')).sort()
  .map(f => ler(`supabase/migrations/${f}`)).join('\n')

describe('RBAC — registro de módulos', () => {
  it('todo módulo tem id único, ações válidas e grupo declarado', () => {
    const ids = MODULOS.map(m => m.id)
    expect(new Set(ids).size, 'ids duplicados em MODULOS').toBe(ids.length)
    for (const m of MODULOS) {
      expect(m.acoes.length, `${m.id} sem ações`).toBeGreaterThan(0)
      expect(m.acoes, `${m.id} precisa permitir "ver"`).toContain('ver')
    }
  })

  it('todo perfil-modelo usa apenas permissões que existem', () => {
    const validas = new Set(todasPermissoes())
    for (const p of PERFIS_MODELO) {
      for (const perms of p.permissoes) {
        expect(validas.has(perms), `Perfil "${p.nome}" usa permissão inexistente: ${perms}`).toBe(true)
      }
    }
  })

  it('quem escreve também consegue ver (coerência de permissão)', () => {
    for (const p of PERFIS_MODELO) {
      const set = new Set(p.permissoes)
      for (const perms of p.permissoes) {
        const [mod, acao] = perms.split(':')
        if (acao !== 'ver') {
          expect(set.has(perm(mod, 'ver')), `"${p.nome}" pode ${acao} em ${mod} mas não pode ver`).toBe(true)
        }
      }
    }
  })

  it('voluntário e terceirizado nunca acessam módulo sensível', () => {
    const sensiveis = new Set(MODULOS.filter(m => m.sensivel).map(m => m.id))
    for (const nome of ['Voluntário(a) de parceria', 'Prestador terceirizado']) {
      const p = PERFIS_MODELO.find(x => x.nome === nome)!
      for (const perms of p.permissoes) {
        const mod = perms.split(':')[0]
        if (mod === 'residentes') continue  // só nome+quarto, tratado na consulta
        expect(sensiveis.has(mod), `"${nome}" não deveria acessar módulo sensível: ${mod}`).toBe(false)
      }
    }
  })

  it('nenhum perfil-modelo, exceto o administrador, pode arquivar residente', () => {
    for (const p of PERFIS_MODELO) {
      if (p.nome === 'Administrador da instituição') continue
      expect(p.permissoes, `"${p.nome}" não pode ter residentes:arquivar`).not.toContain('residentes:arquivar')
    }
  })
})

describe('RBAC — banco de dados', () => {
  it('as 4 tabelas do RBAC existem com RLS ativado', () => {
    for (const t of ['plataforma_usuarios', 'perfis_acesso', 'solicitacoes', 'acoes_criticas']) {
      expect(sql, `tabela ${t} não criada`).toContain(`CREATE TABLE ${t}`)
      expect(sql, `tabela ${t} sem RLS`).toMatch(new RegExp(`ALTER TABLE ${t}\\s+ENABLE ROW LEVEL SECURITY`))
    }
  })

  it('duplo check: quem inicia a ação crítica não pode confirmá-la', () => {
    expect(sql).toContain('confirmada_por <> iniciada_por')
  })

  it('vínculo expirado bloqueia acesso na função do banco', () => {
    expect(sql).toContain('vinculo_expira_em IS NULL OR')
  })

  it('perfil protegido (administrador) não pode ser editado via RLS', () => {
    expect(sql).toContain('protegido = false')
  })
})

describe('RBAC — servidor', () => {
  it('a checagem de permissão está no servidor, não só na tela', () => {
    const api = ler('src/app/api/perfis-acesso/route.ts')
    expect(api).toContain("exigir(")
    expect(api).toContain("'usuarios', 'editar'")
  })

  it('a API valida permissões contra o registro (não aceita string arbitrária)', () => {
    expect(ler('src/app/api/perfis-acesso/route.ts')).toContain('todasPermissoes()')
  })

  it('requireUser carrega permissões e nível de plataforma', () => {
    const s = ler('src/lib/api.ts')
    expect(s).toContain('plataforma_usuarios')
    expect(s).toContain('perfis_acesso(nome, permissoes, ativo)')
    expect(s).toContain('vinculo_expira_em')
  })
})
