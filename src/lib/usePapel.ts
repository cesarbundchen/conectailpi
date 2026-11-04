'use client'
// Hook: papel do usuário logado, para a TELA ocultar o que a API negaria.
// A segurança real continua no servidor (requireUser + RLS); isto é UX.
import { useEffect, useState } from 'react'

export function usePapel() {
  const [papel, setPapel] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/configuracoes').then(r => r.json())
      .then(j => setPapel(j.ok ? j.dados.meu_papel : 'cuidador'))
      .catch(() => setPapel('cuidador'))
  }, [])
  return {
    papel,
    carregado: papel !== null,
    gestor: papel === 'admin' || papel === 'coordenador',            // financeiro, dados
    clinico: ['admin', 'coordenador', 'tecnico'].includes(papel ?? ''), // dietas, avaliações
  }
}
