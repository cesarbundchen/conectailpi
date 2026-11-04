// ═══════════════════════════════════════════════════════════════════
// REGISTRO DE MÓDULOS — fonte única de verdade das permissões
//
// Toda parte do sistema é declarada aqui. A tela de configuração de
// perfis, a checagem no servidor e as políticas RLS derivam DESTE arquivo.
// Adicionar um módulo novo = adicionar uma entrada aqui (e nada mais).
// ═══════════════════════════════════════════════════════════════════

export type Acao = 'ver' | 'incluir' | 'editar' | 'arquivar'

export type Modulo = {
  id: string
  nome: string
  grupo: 'Assistencial' | 'Hotelaria' | 'Administrativo' | 'Sistema'
  descricao: string
  acoes: Acao[]           // ações que fazem sentido neste módulo
  sensivel: boolean       // true = dado clínico/financeiro (LGPD reforçada)
  icone: string
}

export const MODULOS: Modulo[] = [
  // ── Assistencial ──────────────────────────────────────────────
  { id: 'residentes', nome: 'Residentes e prontuário', grupo: 'Assistencial',
    descricao: 'Cadastro, dados pessoais, prontuário completo e arquivamento',
    acoes: ['ver', 'incluir', 'editar', 'arquivar'], sensivel: true, icone: '👥' },

  { id: 'medicamentos', nome: 'Medicamentos', grupo: 'Assistencial',
    descricao: 'Prescrição, administração por horário e suspensão',
    acoes: ['ver', 'incluir', 'editar', 'arquivar'], sensivel: true, icone: '💊' },

  { id: 'ocorrencias', nome: 'Ocorrências', grupo: 'Assistencial',
    descricao: 'Registro de quedas, recusas, intercorrências e desfechos',
    acoes: ['ver', 'incluir', 'editar'], sensivel: true, icone: '⚠️' },

  { id: 'atendimentos', nome: 'Atendimentos e evoluções', grupo: 'Assistencial',
    descricao: 'Consultas, evoluções multiprofissionais e CID-10',
    acoes: ['ver', 'incluir', 'editar'], sensivel: true, icone: '🩺' },

  { id: 'restricoes', nome: 'Restrições e alergias', grupo: 'Assistencial',
    descricao: 'Alergias medicamentosas, restrições alimentares e de mobilidade',
    acoes: ['ver', 'incluir', 'editar', 'arquivar'], sensivel: true, icone: '🚫' },

  { id: 'avaliacoes', nome: 'Escalas de avaliação', grupo: 'Assistencial',
    descricao: 'Katz (AVD), Braden (lesão por pressão) e Morse (quedas)',
    acoes: ['ver', 'incluir'], sensivel: true, icone: '📐' },

  { id: 'registro', nome: 'Registro de cuidados', grupo: 'Assistencial',
    descricao: 'Tela rápida da cuidadora: medicação, sinais vitais e intercorrências (vômito, desmaio, tontura, náusea, dor)',
    acoes: ['ver', 'incluir'], sensivel: true, icone: '📝' },

  // ── Hotelaria e cuidado diário ────────────────────────────────
  { id: 'leitos', nome: 'Leitos e acomodação', grupo: 'Hotelaria',
    descricao: 'Mapa de quartos e leitos, ocupação, transferências internas',
    acoes: ['ver', 'incluir', 'editar'], sensivel: false, icone: '🛏️' },

  { id: 'plantao', nome: 'Passagem de plantão', grupo: 'Hotelaria',
    descricao: 'Quadro de pendências e fechamento de turno',
    acoes: ['ver', 'incluir', 'editar'], sensivel: false, icone: '🗂️' },

  { id: 'cuidados', nome: 'Hidratação e rondas', grupo: 'Hotelaria',
    descricao: 'Mapa de hidratação com metas e registro de rondas',
    acoes: ['ver', 'incluir'], sensivel: false, icone: '💧' },

  { id: 'nutricao', nome: 'Nutrição e dietas', grupo: 'Hotelaria',
    descricao: 'Prescrição de dietas individualizadas e mapa da cozinha',
    acoes: ['ver', 'incluir', 'editar'], sensivel: true, icone: '🍽️' },

  // ── Administrativo ────────────────────────────────────────────
  { id: 'financeiro', nome: 'Financeiro', grupo: 'Administrativo',
    descricao: 'Mensalidades, extras, pagamentos e inadimplência',
    acoes: ['ver', 'incluir', 'editar'], sensivel: true, icone: '💰' },

  { id: 'documentos', nome: 'Documentos', grupo: 'Administrativo',
    descricao: 'Contratos, exames, prescrições e visibilidade no portal',
    acoes: ['ver', 'incluir', 'editar', 'arquivar'], sensivel: true, icone: '📂' },

  { id: 'responsaveis', nome: 'Responsáveis e familiares', grupo: 'Administrativo',
    descricao: 'Cadastro de responsáveis financeiros e acesso ao portal da família',
    acoes: ['ver', 'incluir', 'editar'], sensivel: true, icone: '👨‍👩‍👧' },

  { id: 'relatorios', nome: 'Relatórios e dashboards', grupo: 'Administrativo',
    descricao: 'Painéis por instituição, residente e colaboradora',
    acoes: ['ver'], sensivel: true, icone: '📈' },

  { id: 'dados', nome: 'Importar e exportar dados', grupo: 'Administrativo',
    descricao: 'Migração por planilha e portabilidade LGPD (art. 18)',
    acoes: ['ver', 'incluir'], sensivel: true, icone: '🔄' },

  // ── Sistema ───────────────────────────────────────────────────
  { id: 'historico', nome: 'Histórico de auditoria', grupo: 'Sistema',
    descricao: 'Trilha imutável de todas as ações (somente leitura por definição)',
    acoes: ['ver'], sensivel: true, icone: '📜' },

  { id: 'usuarios', nome: 'Usuários e perfis de acesso', grupo: 'Sistema',
    descricao: 'Convidar pessoas, definir perfis e configurar permissões',
    acoes: ['ver', 'incluir', 'editar', 'arquivar'], sensivel: true, icone: '🔐' },

  { id: 'configuracoes', nome: 'Configurações da instituição', grupo: 'Sistema',
    descricao: 'Dados cadastrais, plano contratado e parâmetros gerais',
    acoes: ['ver', 'editar'], sensivel: false, icone: '⚙️' },

  { id: 'solicitacoes', nome: 'Solicitações de alteração', grupo: 'Sistema',
    descricao: 'Fila de pedidos de correção e exclusão para aprovação',
    acoes: ['ver', 'incluir', 'editar'], sensivel: false, icone: '📨' },
]

export const GRUPOS = ['Assistencial', 'Hotelaria', 'Administrativo', 'Sistema'] as const

export const ROTULO_ACAO: Record<Acao, string> = {
  ver: 'Consultar',
  incluir: 'Incluir',
  editar: 'Alterar',
  arquivar: 'Arquivar',
}

export const AJUDA_ACAO: Record<Acao, string> = {
  ver: 'Abrir a tela e consultar os registros',
  incluir: 'Criar registros novos (nunca exige aprovação)',
  editar: 'Corrigir registros dentro da janela; fora dela vira solicitação',
  arquivar: 'Enviar ao arquivo morto — sempre exige duplo check',
}

// ═══ Permissão = "modulo:acao" (ex.: "financeiro:ver") ═══
export type Permissao = string
export const perm = (modulo: string, acao: Acao): Permissao => `${modulo}:${acao}`

export function todasPermissoes(): Permissao[] {
  return MODULOS.flatMap(m => m.acoes.map(a => perm(m.id, a)))
}

export function modulo(id: string): Modulo | undefined {
  return MODULOS.find(m => m.id === id)
}

// ═══════════════════════════════════════════════════════════════════
// PERFIS-MODELO — sugestões que a empresa pode aplicar e depois ajustar.
// NÃO são fixos: cada instituição cria os seus próprios perfis.
// ═══════════════════════════════════════════════════════════════════
export type PerfilModelo = {
  nome: string
  descricao: string
  formacoes: string
  permissoes: Permissao[]
}

const P = perm
export const PERFIS_MODELO: PerfilModelo[] = [
  {
    nome: 'Administrador da instituição',
    descricao: 'Acesso total, exceto o que a plataforma reserva ao operador de dados',
    formacoes: 'Direção, administrador, gestor',
    permissoes: todasPermissoes(),
  },
  {
    nome: 'Coordenação de enfermagem',
    descricao: 'Assistencial completo + hotelaria, sem financeiro nem configurações',
    formacoes: 'Enfermeiro(a) responsável técnico(a) (COREN)',
    permissoes: [
      ...['residentes','medicamentos','ocorrencias','atendimentos','restricoes','avaliacoes','registro']
        .flatMap(m => (modulo(m)?.acoes ?? []).filter(a => a !== 'arquivar').map(a => P(m, a))),
      ...['leitos','plantao','cuidados','nutricao'].flatMap(m => (modulo(m)?.acoes ?? []).map(a => P(m, a))),
      P('relatorios','ver'), P('historico','ver'), P('solicitacoes','ver'), P('solicitacoes','incluir'),
      P('documentos','ver'), P('responsaveis','ver'),
    ],
  },
  {
    nome: 'Médico(a)',
    descricao: 'Prescrição e evolução clínica; sem acesso administrativo',
    formacoes: 'Médico(a) clínico(a), geriatra, psiquiatra (CRM)',
    permissoes: [
      P('residentes','ver'),
      P('medicamentos','ver'), P('medicamentos','incluir'), P('medicamentos','editar'),
      P('atendimentos','ver'), P('atendimentos','incluir'), P('atendimentos','editar'),
      P('ocorrencias','ver'), P('ocorrencias','incluir'),
      P('restricoes','ver'), P('restricoes','incluir'), P('restricoes','editar'),
      P('avaliacoes','ver'), P('avaliacoes','incluir'),
      P('registro','ver'), P('registro','incluir'),
      P('cuidados','ver'), P('nutricao','ver'), P('documentos','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Técnico(a) de enfermagem',
    descricao: 'Execução do cuidado: administra medicação e registra ocorrências',
    formacoes: 'Técnico(a) e auxiliar de enfermagem (COREN)',
    permissoes: [
      P('residentes','ver'),
      P('medicamentos','ver'), P('medicamentos','incluir'),
      P('ocorrencias','ver'), P('ocorrencias','incluir'),
      P('restricoes','ver'), P('avaliacoes','ver'), P('avaliacoes','incluir'),
      P('registro','ver'), P('registro','incluir'),
      P('plantao','ver'), P('plantao','incluir'), P('plantao','editar'),
      P('cuidados','ver'), P('cuidados','incluir'),
      P('nutricao','ver'), P('leitos','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Cuidador(a) de idosos',
    descricao: 'Cuidado diário: hidratação, rondas, plantão e ocorrências',
    formacoes: 'Cuidador(a) formal de idosos',
    permissoes: [
      P('residentes','ver'),
      P('medicamentos','ver'), P('medicamentos','incluir'),
      P('ocorrencias','ver'), P('ocorrencias','incluir'),
      P('restricoes','ver'),
      P('registro','ver'), P('registro','incluir'),
      P('plantao','ver'), P('plantao','incluir'), P('plantao','editar'),
      P('cuidados','ver'), P('cuidados','incluir'),
      P('nutricao','ver'), P('leitos','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Nutricionista',
    descricao: 'Dono do módulo de nutrição; consulta clínica de apoio',
    formacoes: 'Nutricionista (CRN)',
    permissoes: [
      P('residentes','ver'), P('restricoes','ver'), P('restricoes','incluir'),
      P('nutricao','ver'), P('nutricao','incluir'), P('nutricao','editar'),
      P('cuidados','ver'), P('atendimentos','ver'), P('atendimentos','incluir'),
      P('relatorios','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Fisioterapeuta / T.O. / Fono',
    descricao: 'Evolução da própria área e escalas funcionais',
    formacoes: 'Fisioterapeuta (CREFITO), T.O., fonoaudiólogo(a) (CRFa)',
    permissoes: [
      P('residentes','ver'), P('restricoes','ver'),
      P('atendimentos','ver'), P('atendimentos','incluir'), P('atendimentos','editar'),
      P('avaliacoes','ver'), P('avaliacoes','incluir'),
      P('ocorrencias','ver'), P('ocorrencias','incluir'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Serviço social / Psicologia',
    descricao: 'Acompanhamento psicossocial e vínculo com a família',
    formacoes: 'Assistente social (CRESS), psicólogo(a) (CRP)',
    permissoes: [
      P('residentes','ver'),
      P('atendimentos','ver'), P('atendimentos','incluir'), P('atendimentos','editar'),
      P('ocorrencias','ver'), P('ocorrencias','incluir'),
      P('responsaveis','ver'), P('responsaveis','incluir'), P('responsaveis','editar'),
      P('documentos','ver'), P('relatorios','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Financeiro / Administrativo',
    descricao: 'Mensalidades e documentos, sem qualquer dado clínico',
    formacoes: 'Auxiliar administrativo, contador, financeiro',
    permissoes: [
      P('residentes','ver'),
      P('financeiro','ver'), P('financeiro','incluir'), P('financeiro','editar'),
      P('documentos','ver'), P('documentos','incluir'), P('documentos','editar'),
      P('responsaveis','ver'), P('responsaveis','incluir'), P('responsaveis','editar'),
      P('relatorios','ver'), P('leitos','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Voluntário(a) de parceria',
    descricao: 'Instituição conveniada — acesso mínimo, sem dado clínico',
    formacoes: 'Voluntários, estagiários e alunos de instituições parceiras',
    permissoes: [
      P('residentes','ver'),
      P('plantao','ver'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
  {
    nome: 'Prestador terceirizado',
    descricao: 'Empresa contratada — só o próprio serviço, sem dado pessoal',
    formacoes: 'Lavanderia, cozinha, limpeza, manutenção, transporte',
    permissoes: [
      P('leitos','ver'),
      P('plantao','ver'), P('plantao','incluir'),
      P('solicitacoes','ver'), P('solicitacoes','incluir'),
    ],
  },
]
