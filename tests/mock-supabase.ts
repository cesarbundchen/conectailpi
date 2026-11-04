// Banco simulado: registra cada chamada e devolve resultados configuráveis
type Resultado = { data: any; error: any }

export function fakeQB(resultado: Resultado = { data: null, error: null }) {
  const qb: any = { calls: [] as [string, any[]][], insertArgs: null, updateArgs: null, deleteCalled: false }
  for (const m of ['select', 'eq', 'neq', 'or', 'order', 'limit', 'gte', 'lte']) {
    qb[m] = (...a: any[]) => { qb.calls.push([m, a]); return qb }
  }
  qb.insert = (d: any) => { qb.insertArgs = d; qb.calls.push(['insert', [d]]); return qb }
  qb.update = (d: any) => { qb.updateArgs = d; qb.calls.push(['update', [d]]); return qb }
  qb.delete = () => { qb.deleteCalled = true; qb.calls.push(['delete', []]); return qb }
  qb.single = async () => resultado
  qb.then = (res: any, rej: any) => Promise.resolve(resultado).then(res, rej)
  return qb
}

export function fakeSB(resultadosPorTabela: Record<string, Resultado | Resultado[]> = {}) {
  const tabelas: Record<string, any[]> = {}
  const sb: any = {
    tabelas,
    from(t: string) {
      const conf = resultadosPorTabela[t]
      const r = Array.isArray(conf) ? (conf.shift() ?? { data: null, error: null }) : (conf ?? { data: null, error: null })
      const qb = fakeQB(r)
      ;(tabelas[t] = tabelas[t] || []).push(qb)
      return qb
    },
    auth: {
      admin: {
        criados: [] as any[], deletados: [] as string[],
        criarErro: null as any,
        createUser: async function (this: any, d: any) {
          if (sb.auth.admin.criarErro) return { data: null, error: sb.auth.admin.criarErro }
          sb.auth.admin.criados.push(d)
          return { data: { user: { id: 'user-novo-123' } }, error: null }
        },
        deleteUser: async (id: string) => { sb.auth.admin.deletados.push(id) },
      },
    },
  }
  return sb
}
