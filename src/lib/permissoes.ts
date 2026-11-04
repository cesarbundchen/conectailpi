// ═══════════════════════════════════════════════════════════════════
// CHECAGEM DE PERMISSÃO NO SERVIDOR — barreira real de segurança.
// A tela esconde por cortesia; AQUI se nega de verdade. RLS é a 3a camada.
// ═══════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import type { Acao } from '@/lib/modulos'

export type Contexto = {
  sb: any
  user: { id: string; email?: string }
  ilpi_id: string
  permissoes: string[]
  operador_dados: boolean
  plataforma: 'master' | 'operacao' | 'suporte' | null
  perfil_nome: string
}

export function pode(ctx: Contexto, modulo: string, acao: Acao): boolean {
  // Equipe da plataforma: master e operação passam; suporte NUNCA vê dado clínico
  if (ctx.plataforma === 'master' || ctx.plataforma === 'operacao') return true
  return ctx.permissoes.includes(`${modulo}:${acao}`)
}

export function exigir(ctx: Contexto, modulo: string, acao: Acao) {
  if (pode(ctx, modulo, acao)) return null
  return NextResponse.json(
    { ok: false, erro: `Seu perfil (${ctx.perfil_nome}) não tem permissão para ${acao} em ${modulo}.` },
    { status: 403 },
  )
}

export function exigirOperador(ctx: Contexto) {
  if (ctx.operador_dados || ctx.plataforma === 'master') return null
  return NextResponse.json(
    { ok: false, erro: 'Apenas o Operador de Dados da instituição pode executar esta ação.' },
    { status: 403 },
  )
}

// Janela de autocorreção (Q2 da proposta — 24h, parametrizável)
export const JANELA_AUTOCORRECAO_H = 24

export function dentroDaJanela(criado_em: string): boolean {
  const horas = (Date.now() - new Date(criado_em).getTime()) / 36e5
  return horas <= JANELA_AUTOCORRECAO_H
}

// Ações que exigem duplo check completo (3 camadas)
export const ACOES_CRITICAS = [
  'arquivar_residente', 'registrar_obito', 'exportar_instituicao',
  'desativar_operador', 'alterar_cadastro_empresa',
] as const
export const DIAS_JANELA_REVERSAO = 7
