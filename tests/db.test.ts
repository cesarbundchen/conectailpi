import { describe, it, expect } from 'vitest'
import { fakeSB } from './mock-supabase'
import { registrarSaida, salvarResidente, salvarOcorrencia, listarResidentes } from '@/lib/db'

describe('Saída de residente', () => {
  it('óbito muda status para Falecida', async () => {
    const sb = fakeSB({ saidas: { data: { id: 's1' }, error: null } })
    const r = await registrarSaida(sb, 'ilpi-1', { residente_id: 'r1', tipo_saida: 'Obito', data_saida: '2026-07-13' }, 'u1')
    expect(r.novoStatus).toBe('Falecida')
    expect(sb.tabelas.residentes[0].updateArgs).toEqual({ status: 'Falecida' })
  })
  it('alta muda status para Inativa', async () => {
    const sb = fakeSB({ saidas: { data: { id: 's1' }, error: null } })
    const r = await registrarSaida(sb, 'ilpi-1', { residente_id: 'r1', tipo_saida: 'Alta', data_saida: '2026-07-13' }, 'u1')
    expect(r.novoStatus).toBe('Inativa')
  })
  it('grava a saída no histórico de auditoria', async () => {
    const sb = fakeSB({ saidas: { data: { id: 's1' }, error: null } })
    await registrarSaida(sb, 'ilpi-1', { residente_id: 'r1', tipo_saida: 'Alta', data_saida: '2026-07-13' }, 'u1')
    expect(sb.tabelas.historico?.[0].insertArgs.modulo).toBe('Residentes')
  })
})

describe('Cadastro de residente', () => {
  it('novo cadastro força ilpi_id (multi-tenant)', async () => {
    const sb = fakeSB({ residentes: { data: { id: 'r-novo' }, error: null } })
    await salvarResidente(sb, 'ilpi-1', { nome: 'Maria' }, 'u1')
    expect(sb.tabelas.residentes[0].insertArgs.ilpi_id).toBe('ilpi-1')
  })
  it('com id faz UPDATE (não duplica) e filtra pela ILPI', async () => {
    const sb = fakeSB({ residentes: { data: { id: 'r1' }, error: null } })
    await salvarResidente(sb, 'ilpi-1', { id: 'r1', nome: 'Maria Editada' }, 'u1')
    const qb = sb.tabelas.residentes[0]
    expect(qb.updateArgs.nome).toBe('Maria Editada')
    expect(qb.updateArgs.id).toBeUndefined()
    expect(qb.calls).toContainEqual(['eq', ['ilpi_id', 'ilpi-1']])
  })
})

describe('Ocorrências', () => {
  it('resolver preenche resolvido_em e resolvido_por', async () => {
    const sb = fakeSB({ ocorrencias: { data: { id: 'o1', tipo_ocorrencia: 'Queda', residente_id: 'r1' }, error: null } })
    await salvarOcorrencia(sb, 'ilpi-1', { id: 'o1', status: 'Resolvida', desfecho: 'Ok' }, 'u9')
    const upd = sb.tabelas.ocorrencias[0].updateArgs
    expect(upd.resolvido_por).toBe('u9')
    expect(upd.resolvido_em).toBeTruthy()
  })
  it('nova ocorrência nasce Aberta', async () => {
    const sb = fakeSB({ ocorrencias: { data: { id: 'o2', residente_id: 'r1' }, error: null } })
    await salvarOcorrencia(sb, 'ilpi-1', { residente_id: 'r1', tipo_ocorrencia: 'Queda', descricao: 'x' }, 'u1')
    expect(sb.tabelas.ocorrencias[0].insertArgs.status).toBe('Aberta')
  })
})

describe('Busca de residentes (segurança)', () => {
  it('remove caracteres da sintaxe de filtro do PostgREST', async () => {
    const sb = fakeSB({ residentes: { data: [], error: null } })
    await listarResidentes(sb, 'ilpi-1', { busca: 'x),nome.eq.(admin%' })
    const orCall = sb.tabelas.residentes[0].calls.find((c: any) => c[0] === 'or')
    // Parênteses e vírgulas digitados pelo usuário foram removidos (as vírgulas
    // e % restantes são da sintaxe legítima da própria consulta ilike)
    expect(orCall[1][0]).not.toContain('(')
    expect(orCall[1][0]).not.toContain(')')
    expect(orCall[1][0]).not.toContain('(admin')
  })
  it('busca vazia após sanitização não aplica filtro or', async () => {
    const sb = fakeSB({ residentes: { data: [], error: null } })
    await listarResidentes(sb, 'ilpi-1', { busca: '(((,,,%%%' })
    const orCall = sb.tabelas.residentes[0].calls.find((c: any) => c[0] === 'or')
    expect(orCall).toBeUndefined()
  })
})
