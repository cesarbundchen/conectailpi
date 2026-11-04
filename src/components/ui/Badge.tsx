// Badge de status — mapeia automaticamente status → cor
const MAPA: Record<string, string> = {
  'Ativa': 'bg-ativa', 'Ativo': 'bg-ativa', 'Pago': 'bg-ativa', 'Resolvida': 'bg-ativa', 'Ok': 'bg-ativa',
  'Inativa': 'bg-inativa', 'Arquivado': 'bg-inativa', 'Suspenso': 'bg-inativa',
  'Falecida': 'bg-falecida', 'Aberta': 'bg-aberta', 'Atrasado': 'bg-aberta',
  'Ausente': 'bg-ausente', 'Pendente': 'bg-pendente', 'Monitorando': 'bg-pendente', 'Parcial': 'bg-pendente',
  'Triagem': 'bg-info',
}

export default function Badge({ status }: { status: string }) {
  return <span className={`badge ${MAPA[status] ?? 'bg-inativa'}`}>{status}</span>
}
