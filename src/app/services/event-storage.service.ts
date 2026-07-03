import { Injectable, signal } from '@angular/core';
import {
  CondicaoPagamento,
  EventStatus,
  formatCurrencyMT,
  HistoryEntry,
  KanbanEvent,
  STATUS_COLUMNS,
} from '../models/event.model';

const STORAGE_KEY = 'kanban-eventos-v1';

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

function seedData(): KanbanEvent[] {
  const now = new Date().toISOString();
  const base: Omit<KanbanEvent, 'id' | 'historico'>[] = [
    {
      titulo: 'Verificar stock de válvulas',
      descricao: 'Tarefa interna, não é uma folha de obra para cliente',
      clienteNome: '',
      clienteContacto: '',
      clienteEndereco: '',
      responsavel: 'Gilberto',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Baixa',
      status: 'Pendente',
      criadoEm: now,
    },
    {
      titulo: 'Fuga de gás - Cliente Beira',
      descricao: 'Cliente reportou cheiro a gás na cozinha',
      clienteNome: 'Restaurante Baía Azul',
      clienteContacto: '84 123 4567',
      clienteEndereco: 'Av. Marginal, Beira',
      responsavel: 'Gilberto',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Alta',
      status: 'Folha de Obra',
      criadoEm: now,
    },
    {
      titulo: 'Revisão anual - Cliente Sede',
      descricao: 'Aguarda confirmação de disponibilidade do cliente',
      clienteNome: 'Condomínio Sede Business Park',
      clienteContacto: '82 234 5678',
      clienteEndereco: 'Av. 25 de Setembro, Maputo',
      responsavel: 'Gilberto',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Baixa',
      status: 'Por Agendar',
      criadoEm: now,
    },
    {
      titulo: 'Instalação de linha nova - Empazol',
      descricao: 'Instalação de linha de gás industrial',
      clienteNome: 'Empazol, Lda',
      clienteContacto: '87 345 6789',
      clienteEndereco: 'Zona Industrial da Matola',
      responsavel: 'Joia',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Média',
      status: 'Visita Agendada',
      criadoEm: now,
      dataAgendamento: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d.toISOString();
      })(),
    },
    {
      titulo: 'Substituição de regulador - Gás Solution',
      descricao: 'Regulador com desgaste, aguarda aprovação do cliente',
      clienteNome: 'Gás Solution, Lda',
      clienteContacto: '84 456 7890',
      clienteEndereco: 'Bairro Central, Maputo',
      responsavel: 'Youra Eunice',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Média',
      status: 'Orçamento',
      criadoEm: now,
      valorOrcamento: 8500,
    },
    {
      titulo: 'Manutenção cilindro 11kg - Cliente Matola',
      descricao: 'Verificar válvulas e substituir vedante',
      clienteNome: 'João Machava',
      clienteContacto: '82 567 8901',
      clienteEndereco: 'Bairro Fomento, Matola',
      responsavel: 'Gilberto',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Alta',
      status: 'Aprovado',
      criadoEm: now,
      valorOrcamento: 4200,
      condicaoPagamento: 'Sinal 60%',
    },
    {
      titulo: 'Entrega e troca de cilindros - Cliente X',
      descricao: 'Rota Maputo Sede',
      clienteNome: 'Padaria Central',
      clienteContacto: '87 678 9012',
      clienteEndereco: 'Rua da Rádio, Maputo Sede',
      responsavel: 'Joia',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Média',
      status: 'Em Execução',
      criadoEm: now,
      valorOrcamento: 3100,
      condicaoPagamento: 'Pagamento Total',
    },
    {
      titulo: 'Manutenção rede de gás - Hotel Estrela',
      descricao: 'Obra concluída, aguarda liquidação do saldo pelo cliente',
      clienteNome: 'Hotel Estrela do Índico',
      clienteContacto: '82 890 1234',
      clienteEndereco: 'Av. da Marginal, Maputo',
      responsavel: 'Gilberto',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Alta',
      status: 'Pendente de Pagamento',
      criadoEm: now,
      valorOrcamento: 12000,
      condicaoPagamento: 'Sinal 60%',
    },
    {
      titulo: 'Reparação de avaria - Cliente W',
      descricao: 'Avaria em queimador industrial resolvida',
      clienteNome: 'Wamba Indústrias',
      clienteContacto: '84 789 0123',
      clienteEndereco: 'Zona Industrial, Beira',
      responsavel: 'Youra Eunice',
      dataPrevista: new Date().toISOString().slice(0, 10),
      prioridade: 'Baixa',
      status: 'Finalizado',
      criadoEm: now,
      valorOrcamento: 5600,
      condicaoPagamento: 'Pagamento Total',
    },
  ];

  return base.map((e) => {
    const t0 = new Date(e.criadoEm).getTime();
    const offset = (min: number) => new Date(t0 + min * 60 * 1000).toISOString();

    const historico: HistoryEntry[] = [creationEntry('Folha de Obra', e.criadoEm)];
    if (e.condicaoPagamento) {
      historico.push({
        id: uid(),
        tipo: 'aprovacao',
        data: offset(5),
        texto: `Orçamento aprovado: ${formatCurrencyMT(e.valorOrcamento ?? 0)} — ${e.condicaoPagamento}.`,
        deStatus: 'Orçamento',
        paraStatus: 'Aprovado',
      });
    }
    const progressao: [EventStatus, EventStatus, string][] = [
      ['Aprovado', 'Em Execução', 'Equipa técnica iniciou os trabalhos no local.'],
      ['Em Execução', 'Pendente de Pagamento', 'Trabalho concluído; aguarda liquidação do saldo pelo cliente.'],
      ['Pendente de Pagamento', 'Finalizado', 'Saldo recebido e serviço encerrado.'],
    ];
    const ordem: EventStatus[] = ['Aprovado', 'Em Execução', 'Pendente de Pagamento', 'Finalizado'];
    const alvoIdx = ordem.indexOf(e.status);
    if (alvoIdx > 0) {
      progressao.slice(0, alvoIdx).forEach(([de, para, texto], i) => {
        historico.push({
          id: uid(),
          tipo: 'status',
          data: offset(10 + i * 10),
          texto,
          deStatus: de,
          paraStatus: para,
        });
      });
    }

    return { ...e, id: uid(), historico };
  });
}

@Injectable({ providedIn: 'root' })
export class EventStorageService {
  events = signal<KanbanEvent[]>(this.load());

  private load(): KanbanEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = seedData();
        this.persist(seeded);
        return seeded;
      }
      const parsed = JSON.parse(raw) as KanbanEvent[];
      // Migração: eventos gravados com o fluxo antigo (Pendente/Por Realizar/Concluído),
      // sem histórico, ou sem dados do cliente ganham os novos campos.
      return parsed.map((e) => {
        const status = migrateStatus(e.status as unknown as string);
        return {
          ...e,
          status,
          historico: e.historico ?? [creationEntry(status, e.criadoEm)],
          clienteNome: e.clienteNome ?? '',
          clienteContacto: e.clienteContacto ?? '',
          clienteEndereco: e.clienteEndereco ?? '',
        };
      });
    } catch {
      return seedData();
    }
  }

  private persist(events: KanbanEvent[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  private commit(events: KanbanEvent[]): void {
    this.events.set(events);
    this.persist(events);
  }

  add(event: Omit<KanbanEvent, 'id' | 'criadoEm' | 'historico'>): void {
    const criadoEm = new Date().toISOString();
    const newEvent: KanbanEvent = {
      ...event,
      id: uid(),
      criadoEm,
      historico: [creationEntry(event.status, criadoEm)],
    };
    this.commit([newEvent, ...this.events()]);
  }

  update(id: string, changes: Partial<KanbanEvent>): void {
    this.commit(this.events().map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }

  remove(id: string): void {
    this.commit(this.events().filter((e) => e.id !== id));
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

    this.commit(
      events.map((e) => (e.id === id ? { ...e, status, historico: [...e.historico, entry] } : e))
    );
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

    this.commit(
      events.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'Aprovado',
              valorOrcamento: valor,
              condicaoPagamento: condicao,
              historico: [...e.historico, entry],
            }
          : e
      )
    );
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

    this.commit(
      events.map((e) =>
        e.id === id
          ? { ...e, status: 'Visita Agendada', dataAgendamento, historico: [...e.historico, entry] }
          : e
      )
    );
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

    this.commit(
      events.map((e) =>
        e.id === id
          ? { ...e, status: 'Finalizado', condicaoPagamento: 'Pagamento Total', historico: [...e.historico, entry] }
          : e
      )
    );
  }

  reorderWithinStatus(orderedIds: string[], status: EventStatus): void {
    const others = this.events().filter((e) => e.status !== status);
    const moved = orderedIds
      .map((id) => this.events().find((e) => e.id === id))
      .filter((e): e is KanbanEvent => !!e);
    this.commit([...others, ...moved]);
  }

  /** Regista uma atividade diária no histórico do evento. */
  addActivity(id: string, texto: string): void {
    const t = texto.trim();
    if (!t) return;

    const entry: HistoryEntry = {
      id: uid(),
      tipo: 'atividade',
      data: new Date().toISOString(),
      texto: t,
    };

    this.commit(
      this.events().map((e) => (e.id === id ? { ...e, historico: [...e.historico, entry] } : e))
    );
  }
}
