export type EventStatus =
  | 'Pendente'
  | 'Folha de Obra'
  | 'Por Agendar'
  | 'Visita Agendada'
  | 'Orçamento'
  | 'Aprovado'
  | 'Em Execução'
  | 'Pendente de Pagamento'
  | 'Finalizado';

export type EventPriority = 'Baixa' | 'Média' | 'Alta';

export type CondicaoPagamento = 'Sinal 60%' | 'Pagamento Total';

export type HistoryEntryType = 'criacao' | 'status' | 'atividade' | 'aprovacao' | 'agendamento' | 'pagamento';

export interface HistoryEntry {
  id: string;
  tipo: HistoryEntryType;
  data: string; // ISO datetime
  texto: string;
  deStatus?: EventStatus;
  paraStatus?: EventStatus;
}

export interface KanbanEvent {
  id: string;
  titulo: string;
  descricao: string; // trabalho a realizar
  clienteNome: string;
  clienteContacto: string;
  clienteEndereco: string;
  responsavel: string;
  dataPrevista: string; // ISO date string (yyyy-mm-dd)
  prioridade: EventPriority;
  status: EventStatus;
  criadoEm: string;
  historico: HistoryEntry[];
  valorOrcamento?: number;
  condicaoPagamento?: CondicaoPagamento;
  dataAgendamento?: string; // ISO datetime da visita agendada
}

export const STATUS_COLUMNS: EventStatus[] = [
  'Folha de Obra',
  'Pendente',
  'Por Agendar',
  'Visita Agendada',
  'Orçamento',
  'Aprovado',
  'Em Execução',
  'Pendente de Pagamento',
  'Finalizado',
];

export function formatCurrencyMT(value: number): string {
  return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(value) + ' MT';
}

/** Saldo em falta: só existe quando o cliente pagou apenas o sinal de 60%. */
export function saldoPendente(ev: Pick<KanbanEvent, 'valorOrcamento' | 'condicaoPagamento'>): number {
  if (!ev.valorOrcamento || ev.condicaoPagamento !== 'Sinal 60%') return 0;
  return ev.valorOrcamento * 0.4;
}
