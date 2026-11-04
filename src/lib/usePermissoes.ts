'use client'
// Hook: permissões do usuário logado, para a TELA esconder o que a API negaria.
// Segurança real continua no servidor (permissoes.ts) e no banco (RLS).
import { useEffect, useState } from 'react'
import type { Acao } from '@/lib/modulos'

type Estado = {
  permissoes: string[]
  operador_dados: boolean
  plataforma: string | null
  perfil_nome: string
  carregado: boolean
}

export function usePermissoes() {
  const [e, setE] = useState<Estado>({ permissoes: [], operador_dados: false, plataforma: null, perfil_nome: '', carregado: false })
  useEffect(() => {
    fetch('/api/meu-acesso').then(r => r.json())
      .then(j => setE(j.ok ? { ...j.dados, carregado: true } : { ...e, carregado: true }))
      .catch(() => setE(x => ({ ...x, carregado: true })))
  }, [])
  return {
    ...e,
    pode: (modulo: string, acao: Acao) =>
      e.plataforma === 'master' || e.plataforma === 'operacao' || e.permissoes.includes(`${modulo}:${acao}`),
    veModulo: (modulo: string) => e.permissoes.some(p => p.startsWith(modulo + ':')) || !!e.plataforma,
  }
}
