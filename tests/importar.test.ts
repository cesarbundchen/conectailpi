import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeSB } from './mock-supabase'

const ctxMock: any = {}
vi.mock('@/lib/api', async (orig) => {
  const real: any = await orig()
  return { ...real, requireUser: async () => ctxMock.valor }
})
import { POST } from '@/app/api/importar/route'

function req(body: any) { return { json: async () => body } as any }
function ctx(papel = 'admin', resultados = {}) {
  ctxMock.valor = { sb: fakeSB(resultados), user: { id: 'u1' }, ilpi_id: 'ilpi-1', papel }
  return ctxMock.valor
}

describe('Importação — validações', () => {
  beforeEach(() => ctx())

  it('cuidador não pode importar (403)', async () => {
    ctx('cuidador')
    const r = await POST(req({ entidade: 'residentes', linhas: [{ nome: 'X' }] }))
    expect(r.status).toBe(403)
  })
  it('entidade inválida → 400', async () => {
    const r = await POST(req({ entidade: 'hackers', linhas: [{}] }))
    expect(r.status).toBe(400)
  })
  it('mais de 500 linhas → 400', async () => {
    const r = await POST(req({ entidade: 'residentes', linhas: Array(501).fill({ nome: 'X' }) }))
    expect(r.status).toBe(400)
  })
  it('residente sem nome vira erro de linha, sem travar o lote', async () => {
    const c = ctx('admin', { residentes: [{ data: { id: 'r1' }, error: null }, { data: { id: 'r2' }, error: null }] })
    const r = await POST(req({ entidade: 'residentes', linhas: [{ nome: 'Ok Silva' }, { nome: '' }] }))
    const j = await r.json()
    expect(j.dados.importadas).toBe(1)
    expect(j.dados.erros[0].linha).toBe(2)
  })
  it('status desconhecido vira Ativa (não quebra o banco)', async () => {
    const c = ctx('admin', { residentes: { data: { id: 'r1' }, error: null } })
    await POST(req({ entidade: 'residentes', linhas: [{ nome: 'Maria', status: 'Qualquer' }] }))
    expect(c.sb.tabelas.residentes[0].insertArgs.status).toBe('Ativa')
  })
  it('medicamento de residente inexistente → erro nomeando a linha', async () => {
    ctx('admin', { residentes: { data: [{ id: 'r1', nome: 'Maria da Silva' }], error: null } })
    const r = await POST(req({ entidade: 'medicamentos', linhas: [{ residente_nome: 'Fulana Errada', nome_medicamento: 'X' }] }))
    const j = await r.json()
    expect(j.dados.importadas).toBe(0)
    expect(j.dados.erros[0].erro).toContain('Fulana Errada')
  })
  it('horários "08:00; 20:00" viram array e vínculo é pelo nome (case-insensitive)', async () => {
    const c = ctx('admin', {
      residentes: { data: [{ id: 'r1', nome: 'Maria da Silva' }], error: null },
      medicamentos: { data: { id: 'm1' }, error: null },
    })
    const r = await POST(req({ entidade: 'medicamentos', linhas: [{ residente_nome: '  MARIA DA SILVA ', nome_medicamento: 'Losartana', horarios: '08:00; 20:00', controlado: 'sim' }] }))
    const j = await r.json()
    expect(j.dados.importadas).toBe(1)
    const ins = c.sb.tabelas.medicamentos[0].insertArgs
    expect(ins.horarios).toEqual(['08:00', '20:00'])
    expect(ins.controlado).toBe(true)
    expect(ins.residente_id).toBe('r1')
  })
  it('financeiro com mês 13 → erro de linha', async () => {
    ctx('admin', { residentes: { data: [{ id: 'r1', nome: 'Maria' }], error: null } })
    const r = await POST(req({ entidade: 'financeiro', linhas: [{ residente_nome: 'Maria', mes: '13', ano: '2026', mensalidade: '100' }] }))
    const j = await r.json()
    expect(j.dados.erros.length).toBe(1)
  })
})
