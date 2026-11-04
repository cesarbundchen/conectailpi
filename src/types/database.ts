// Tipos das tabelas do Supabase — ConectaILPI SaaS

export type StatusResidente = 'Triagem' | 'Ativa' | 'Ausente' | 'Inativa' | 'Falecida'
export type TipoSaida = 'Alta' | 'Transferência' | 'Obito'

export interface Residente {
  meta_hidratacao_ml?: number | null
  id: string
  ilpi_id: string
  nome: string
  nome_social: string | null
  data_nascimento: string | null
  cpf: string | null
  rg: string | null
  naturalidade: string | null
  estado_civil: string | null
  religiao: string | null
  escolaridade: string | null
  profissao: string | null
  quarto: string | null
  leito: string | null
  data_admissao: string | null
  grau_dependencia: string | null
  status: StatusResidente
  observacoes: string | null
  portal_token: string | null
  criado_em: string
  atualizado_em: string
}

export interface Medicamento {
  id: string; ilpi_id: string; residente_id: string
  nome_medicamento: string; dosagem: string | null; via: string | null
  horarios: string[] | null; frequencia: string | null
  data_inicio: string | null; data_fim: string | null
  medico_crm: string | null; medico_nome: string | null
  controlado: boolean; observacoes: string | null
  status: 'Ativo' | 'Suspenso' | 'Arquivado'; arquivado: boolean
}

export interface Ocorrencia {
  id: string; ilpi_id: string; residente_id: string
  tipo_ocorrencia: string; data_hora: string; local: string | null
  descricao: string; acao_imediata: string | null; desfecho: string | null
  status: 'Aberta' | 'Monitorando' | 'Resolvida'
  familiar_notificado: boolean; visivel_portal: boolean; arquivado: boolean
}

export interface Atendimento {
  id: string; ilpi_id: string; residente_id: string
  data_hora: string; tipo_atendimento: string
  medico_crm: string | null; medico_nome: string | null
  diagnostico: string | null; cid10: string | null; conduta: string | null
  arquivado: boolean
}

export interface Restricao {
  id: string; ilpi_id: string; residente_id: string
  tipo: string; descricao: string; gravidade: 'Alta' | 'Média' | 'Baixa'
  status: 'Ativa' | 'Inativa'; arquivado: boolean
}

export interface Financeiro {
  id: string; ilpi_id: string; residente_id: string
  mes: number; ano: number; mensalidade: number; extras: number
  valor_pago: number; data_pagamento: string | null
  forma_pagamento: string | null
  status: 'Pendente' | 'Pago' | 'Parcial' | 'Atrasado'; arquivado: boolean
}

export interface Documento {
  id: string; ilpi_id: string; residente_id: string
  tipo: string; nome: string; drive_url: string | null
  data_documento: string | null; status: string
  visivel_portal: boolean; arquivado: boolean
}

export interface Responsavel {
  id: string; ilpi_id: string; residente_id: string
  nome: string; cpf: string | null; parentesco: string | null
  tipo: 'Financeiro' | 'Familiar' | 'Ambos' | null
  telefone_principal: string | null; email: string | null
  autorizado_retirada: boolean; acesso_portal: boolean; arquivado: boolean
}

export interface ProntuarioCompleto {
  residente: Residente
  medicamentos: Medicamento[]
  ocorrencias: Ocorrencia[]
  atendimentos: Atendimento[]
  restricoes: Restricao[]
  financeiro: Financeiro[]
  documentos: Documento[]
  responsaveis: Responsavel[]
}
