import { describe, it, expect, vi } from 'vitest'
import { fakeSB } from './mock-supabase'

const ctxMock: any = {}
vi.mock('@/lib/api', async (orig) => {
  const real: any = await orig()
  return { ...real, requireUser: async () => ctxMock.valor }
})
vi.mock('@/lib/supabase', () => ({ createAdminSupabase: () => fakeSB() }))
import { POST as finPOST } from '@/app/api/financeiro/route'
import { POST as usuPOST, PATCH as usuPATCH } from '@/app/api/usuarios/route'

function ctx(papel: string, resultados = {}) {
  ctxMock.valor = { sb: fakeSB(resultados), user: { id: 'u1' }, ilpi_id: 'ilpi-1', papel }
  return ctxMock.valor
}
const req = (b: any) => ({ json: async () => b, nextUrl: { searchParams: new URLSearchParams() } } as any)

describe('Permissões por papel', () => {
  it('cuidador NÃO lança financeiro (403)', async () => {
    ctx('cuidador')
    const r = await finPOST(req({ residente_id: 'r1', mes: 7, ano: 2026, mensalidade: 100 }))
    expect(r.status).toBe(403)
  })
  it('coordenador lança financeiro', async () => {
    ctx('coordenador', { financeiro: { data: { id: 'f1', mes: 7, ano: 2026, residente_id: 'r1' }, error: null } })
    const r = await finPOST(req({ residente_id: 'r1', mes: 7, ano: 2026, mensalidade: 100 }))
    expect((await r.json()).ok).toBe(true)
  })
  it('técnico NÃO cria usuários (403)', async () => {
    ctx('tecnico')
    const r = await usuPOST(req({ nome: 'X', email: 'x@x.com', senha: '12345678', papel: 'cuidador' }))
    expect(r.status).toBe(403)
  })
  it('papel inventado é rejeitado (400)', async () => {
    ctx('admin')
    const r = await usuPOST(req({ nome: 'X', email: 'x@x.com', senha: '12345678', papel: 'superhacker' }))
    expect(r.status).toBe(400)
  })
  it('admin não desativa a si mesmo (400)', async () => {
    ctx('admin')
    const r = await usuPATCH(req({ id: 'u1', ativo: false }))
    expect(r.status).toBe(400)
  })
})
