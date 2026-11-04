// Devolve o acesso do usuário logado para a interface se adaptar
import { requireUser, respOk } from '@/lib/api'

export async function GET() {
  const ctx = await requireUser()
  if ('erro' in ctx) return ctx.erro
  return respOk({
    permissoes: ctx.permissoes,
    operador_dados: ctx.operador_dados,
    plataforma: ctx.plataforma,
    perfil_nome: ctx.perfil_nome,
  })
}
