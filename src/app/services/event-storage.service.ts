import { Injectable, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  CondicaoPagamento,
  EventStatus,
  formatCurrencyMT,
  HistoryEntry,
  KanbanEvent,
  STATUS_COLUMNS,
} from '../models/event.model';
import { supabase } from './supabase.client';

const TABLE = 'eventos';

const LEGACY_STATUS_MAP: Record<string, EventStatus> = {
  'Por Realizar': 'Em Execução',
  Concluído: 'Finalizado',
};

function migrateStatus(status: string): EventStatus {
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status];
  return (STATUS_COLUMNS as string[]).includes(status) ? (status as EventStatus) : 'Folha de Obra';
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function creationEntry(status: EventStatus, quando: string): HistoryEntry {
  return {
    id: uid(),
    tipo: 'criacao',
    data: quando,
    texto: `Registo criado em "${status}"`,
  };
}

/** Linha da tabela `eventos` no Supabase (snake_case). */
interface EventoRow {
  id: string;
  titulo: string;
  descricao: string;
  cliente_nome: string;
  cliente_contacto: string;
  cliente_endereco: string;
  responsavel: string;
  data_prevista: string | null;
  prioridade: string;
  status: string;
  criado_em: string;
  historico: HistoryEntry[];
  valor_orcamento: number | null;
  condicao_pagamento: string | null;
  data_agendamento: string | null;
  ordem: number;
}

function rowToEvent(row: EventoRow): KanbanEvent {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    clienteNome: row.cliente_nome,
    clienteContacto: row.cliente_contacto,
    clienteEndereco: row.cliente_endereco,
    responsavel: row.responsavel,
    dataPrevista: row.data_prevista ?? '',
    prioridade: row.prioridade as KanbanEvent['prioridade'],
    status: migrateStatus(row.status),
    criadoEm: row.criado_em,
    historico: Array.isArray(row.historico) ? row.historico : [],
    valorOrcamento: row.valor_orcamento ?? undefined,
    condicaoPagamento: (row.condicao_pagamento as CondicaoPagamento | null) ?? undefined,
    dataAgendamento: row.data_agendamento ?? undefined,
  };
}

function eventToRow(ev: KanbanEvent, ordem: number): EventoRow {
  return {
    id: ev.id,
    titulo: ev.titulo,
    descricao: ev.descricao,
    cliente_nome: ev.clienteNome,
    cliente_contacto: ev.clienteContacto,
    cliente_endereco: ev.clienteEndereco,
    responsavel: ev.responsavel,
    data_prevista: ev.dataPrevista || null,
    prioridade: ev.prioridade,
    status: ev.status,
    criado_em: ev.criadoEm,
    historico: ev.historico,
    valor_orcamento: ev.valorOrcamento ?? null,
    condicao_pagamento: ev.condicaoPagamento ?? null,
    data_agendamento: ev.dataAgendamento ?? null,
    ordem,
  };
}

@Injectable({ providedIn: 'root' })
export class EventStorageService {
  events = signal<KanbanEvent[]>([]);
  loading = signal(true);
  syncError = signal<string | null>(null);

  private channel: RealtimeChannel | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadFromServer();
    this.subscribeRealtime();
  }

  private async loadFromServer(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: false });

    if (error) {
      this.syncError.set('Não foi possível ligar à base de dados. A verificar ligação...');
      this.loading.set(false);
      return;
    }

    this.syncError.set(null);
    this.events.set((data as EventoRow[]).map(rowToEvent));
    this.loading.set(false);
  }

  private subscribeRealtime(): void {
    this.channel = supabase
      .channel('eventos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id: string }).id;
          this.events.update((list) => list.filter((e) => e.id !== oldId));
          return;
        }
        const incoming = rowToEvent(payload.new as EventoRow);
        this.events.update((list) => {
          const idx = list.findIndex((e) => e.id === incoming.id);
          if (idx === -1) return [incoming, ...list];
          const next = [...list];
          next[idx] = incoming;
          return next;
        });
      })
      .subscribe();
  }

  private async persistRow(ev: KanbanEvent, ordem = 0): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(eventToRow(ev, ordem));
    if (error) {
      this.syncError.set('Falha ao guardar alteração. Verifique a ligação à internet.');
    } else {
      this.syncError.set(null);
    }
  }

  private setLocal(events: KanbanEvent[]): void {
    this.events.set(events);
  }

  add(event: Omit<KanbanEvent, 'id' | 'criadoEm' | 'historico'>): void {
    const criadoEm = new Date().toISOString();
    const newEvent: KanbanEvent = {
      ...event,
      id: uid(),
      criadoEm,
      historico: [creationEntry(event.status, criadoEm)],
    };
    this.setLocal([newEvent, ...this.events()]);
    void this.persistRow(newEvent);
  }

  update(id: string, changes: Partial<KanbanEvent>): void {
    const updated = this.events().map((e) => (e.id === id ? { ...e, ...changes } : e));
    this.setLocal(updated);
    const ev = updated.find((e) => e.id === id);
    if (ev) void this.persistRow(ev);
  }

  remove(id: string): void {
    this.setLocal(this.events().filter((e) => e.id !== id));
    void supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) this.syncError.set('Falha ao apagar. Verifique a ligação à internet.');
      });
  }

  /** Muda o estado de uma folha de obra, exigindo um motivo que fica registado no histórico. */
  moveToStatus(id: string, status: EventStatus, motivo: string): void {
    const events = this.events();
    const ev = events.find((e) => e.id === id);
    if (!ev || ev.status === status) return;

    const entry: HistoryEntry = {
      id: uid(),
      tipo: 'status',
      data: new Date().toISOString(),
      texto: motivo.trim(),
      deStatus: ev.status,
      paraStatus: status,
    };

    const updatedEv = { ...ev, status, historico: [...ev.historico, entry] };
    this.setLocal(events.map((e) => (e.id === id ? updatedEv : e)));
    void this.persistRow(updatedEv);
  }

  /**
   * Aprova o orçamento de uma folha de obra: regista o valor e a condição de pagamento
   * acordados com o cliente (sinal de 60% ou pagamento total) e move para "Aprovado".
   */
  approveBudget(id: string, valor: number, condicao: CondicaoPagamento, observacao: string): void {
    const events = this.events();
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    const obs = observacao.trim();
    const entry: HistoryEntry = {
      id: uid(),
      tipo: 'aprovacao',
      data: new Date().toISOString(),
      texto: `Orçamento aprovado: ${formatCurrencyMT(valor)} — ${condicao}.${obs ? ' ' + obs : ''}`,
      deStatus: ev.status,
      paraStatus: 'Aprovado',
    };

    const updatedEv: KanbanEvent = {
      ...ev,
      status: 'Aprovado',
      valorOrcamento: valor,
      condicaoPagamento: condicao,
      historico: [...ev.historico, entry],
    };
    this.setLocal(events.map((e) => (e.id === id ? updatedEv : e)));
    void this.persistRow(updatedEv);
  }

  /** Agenda a visita ao cliente: regista a data/hora combinada e move para "Visita Agendada". */
  scheduleVisit(id: string, dataAgendamento: string, observacao: string): void {
    const events = this.events();
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    const obs = observacao.trim();
    const dataFormatada = new Date(dataAgendamento).toLocaleString('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const entry: HistoryEntry = {
      id: uid(),
      tipo: 'agendamento',
      data: new Date().toISOString(),
      texto: `Visita agendada para ${dataFormatada}.${obs ? ' ' + obs : ''}`,
      deStatus: ev.status,
      paraStatus: 'Visita Agendada',
    };

    const updatedEv: KanbanEvent = {
      ...ev,
      status: 'Visita Agendada',
      dataAgendamento,
      historico: [...ev.historico, entry],
    };
    this.setLocal(events.map((e) => (e.id === id ? updatedEv : e)));
    void this.persistRow(updatedEv);
  }

  /**
   * Confirma o pagamento final (saldo em falta após o sinal de 60%) e move para "Finalizado".
   * A partir daqui a folha de obra fica marcada como paga na totalidade.
   */
  confirmFinalPayment(id: string, valor: number, observacao: string): void {
    const events = this.events();
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    const obs = observacao.trim();
    const entry: HistoryEntry = {
      id: uid(),
      tipo: 'pagamento',
      data: new Date().toISOString(),
      texto: `Pagamento final confirmado: ${formatCurrencyMT(valor)}.${obs ? ' ' + obs : ''}`,
      deStatus: ev.status,
      paraStatus: 'Finalizado',
    };

    const updatedEv: KanbanEvent = {
      ...ev,
      status: 'Finalizado',
      condicaoPagamento: 'Pagamento Total',
      historico: [...ev.historico, entry],
    };
    this.setLocal(events.map((e) => (e.id === id ? updatedEv : e)));
    void this.persistRow(updatedEv);
  }

  reorderWithinStatus(orderedIds: string[], status: EventStatus): void {
    const others = this.events().filter((e) => e.status !== status);
    const moved = orderedIds
      .map((id) => this.events().find((e) => e.id === id))
      .filter((e): e is KanbanEvent => !!e);
    this.setLocal([...others, ...moved]);

    moved.forEach((ev, i) => {
      void this.persistRow(ev, i);
    });
  }

  /** Regista uma atividade diária no histórico do evento. */
  addActivity(id: string, texto: string): void {
    const t = texto.trim();
    if (!t) return;

    const events = this.events();
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    const entry: HistoryEntry = {
      id: uid(),
      tipo: 'atividade',
      data: new Date().toISOString(),
      texto: t,
    };

    const updatedEv = { ...ev, historico: [...ev.historico, entry] };
    this.setLocal(events.map((e) => (e.id === id ? updatedEv : e)));
    void this.persistRow(updatedEv);
  }
}
