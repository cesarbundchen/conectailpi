import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeSB } from './mock-supabase'
import { todasPermissoes } from '@/lib/modulos'

const admMock: any = {}
vi.mock('@/lib/supabase', () => ({ createAdminSupabase: () => admMock.sb }))
import { POST } from '@/app/api/cadastro/route'

let seqIp = 0
function req(body: any, ip?: string) {
  return {
    json: async () => body,
    headers: { get: () => ip ?? `10.0.0.${++seqIp}` },
  } as any
}
const bom = { convite: 'segredo-certo', ilpi_nome: 'Lar Teste', admin_nome: 'Ana', email: 'ana@teste.com', senha: '12345678' }

describe('Cadastro de nova ILPI', () => {
  beforeEach(() => {
    process.env.INVITE_SECRET = 'segredo-certo'
    admMock.sb = fakeSB({
      ilpis: { data: { id: 'ilpi-nova' }, error: null },
      perfis_acesso: { data: { id: 'perfil-admin-1' }, error: null },
    })
  })

  it('convite errado → 403 e nada é criado', async () => {
    const r = await POST(req({ ...bom, convite: 'errado' }))
    expect(r.status).toBe(403)
    expect(admMock.sb.tabelas.ilpis).toBeUndefined()
  })
  it('senha curta → 400', async () => {
    const r = await POST(req({ ...bom, senha: '123' }))
    expect(r.status).toBe(400)
  })
  it('sucesso cria ILPI + usuário + perfil admin + auditoria', async () => {
    const r = await POST(req(bom))
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(admMock.sb.auth.admin.criados[0].email).toBe('ana@teste.com')
    expect(admMock.sb.tabelas.perfis[0].insertArgs.papel).toBe('admin')
    expect(admMock.sb.tabelas.historico[0].insertArgs.acao).toBe('Cadastro da ILPI')
  })
  it('admin nasce com perfil de acesso completo e como Operador de Dados', async () => {
    const r = await POST(req(bom))
    expect((await r.json()).ok).toBe(true)
    const pa = admMock.sb.tabelas.perfis_acesso[0].insertArgs
    expect(pa.ilpi_id).toBe('ilpi-nova')
    expect(pa.protegido).toBe(true)
    expect(pa.permissoes).toEqual(todasPermissoes())
    const perfil = admMock.sb.tabelas.perfis[0].insertArgs
    expect(perfil.perfil_acesso_id).toBe('perfil-admin-1')
    expect(perfil.operador_dados).toBe(true)
  })
  it('falha ao criar o perfil de acesso → rollback do usuário e da ILPI, com a mensagem real', async () => {
    admMock.sb = fakeSB({
      ilpis: { data: { id: 'ilpi-nova' }, error: null },
      perfis_acesso: { data: null, error: { message: 'relation "perfis_acesso" does not exist' } },
    })
    const r = await POST(req(bom))
    expect(r.status).toBe(500)
    expect((await r.json()).erro).toContain('perfis_acesso')
    expect(admMock.sb.auth.admin.deletados).toEqual(['user-novo-123'])
    expect(admMock.sb.tabelas.ilpis.some((q: any) => q.deleteCalled)).toBe(true)
    expect(admMock.sb.tabelas.perfis).toBeUndefined()
  })
  it('e-mail duplicado → rollback apaga a ILPI órfã', async () => {
    admMock.sb.auth.admin.criarErro = { message: 'User already registered' }
    const r = await POST(req(bom))
    expect(r.status).toBe(400)
    expect(admMock.sb.tabelas.ilpis.some((q: any) => q.deleteCalled)).toBe(true)
  })
  it('rate limit: 6ª tentativa do mesmo IP → 429', async () => {
    let ultimo: any
    for (let i = 0; i < 6; i++) ultimo = await POST(req({ ...bom, convite: 'errado' }, '99.99.99.99'))
    expect(ultimo.status).toBe(429)
  })
})
