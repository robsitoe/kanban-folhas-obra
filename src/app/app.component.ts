import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { EventStorageService } from './services/event-storage.service';
import { AuthService } from './services/auth.service';
import {
  CondicaoPagamento,
  EventPriority,
  EventStatus,
  formatCurrencyMT,
  HistoryEntry,
  KanbanEvent,
  saldoPendente,
  STATUS_COLUMNS,
} from './models/event.model';

interface PendingMove {
  id: string;
  titulo: string;
  from: EventStatus;
  to: EventStatus;
}

interface PendingApproval {
  id: string;
  titulo: string;
}

interface PendingPayment {
  id: string;
  titulo: string;
}

interface PendingSchedule {
  id: string;
  titulo: string;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  inMonth: boolean;
  isToday: boolean;
  events: KanbanEvent[];
}

interface StatusSummary {
  status: EventStatus;
  events: KanbanEvent[];
}

type ViewMode = 'board' | 'calendar' | 'summary';

interface NewEventForm {
  titulo: string;
  descricao: string;
  clienteNome: string;
  clienteContacto: string;
  clienteEndereco: string;
  responsavel: string;
  dataPrevista: string;
  prioridade: EventPriority;
  status: EventStatus;
  valorOrcamento: number | null;
}

function emptyForm(): NewEventForm {
  return {
    titulo: '',
    descricao: '',
    clienteNome: '',
    clienteContacto: '',
    clienteEndereco: '',
    responsavel: '',
    dataPrevista: new Date().toISOString().slice(0, 10),
    prioridade: 'Média',
    status: 'Folha de Obra',
    valorOrcamento: null,
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  columns = STATUS_COLUMNS;
  showForm = signal(false);
  editingId = signal<string | null>(null);
  form = signal<NewEventForm>(emptyForm());
  formError = signal(false);
  searchTerm = signal('');
  filterResponsavel = signal('');
  filterPrioridade = signal<EventPriority | ''>('');
  filterStatuses = signal<Set<EventStatus>>(new Set());
  onlyOverdue = signal(false);
  showFilters = signal(false);

  pendingMove = signal<PendingMove | null>(null);
  moveReason = signal('');
  moveReasonError = signal(false);

  pendingApproval = signal<PendingApproval | null>(null);
  approvalValor = signal<number | null>(null);
  approvalCondicao = signal<CondicaoPagamento | ''>('');
  approvalObservacao = signal('');
  approvalError = signal(false);

  pendingSchedule = signal<PendingSchedule | null>(null);
  scheduleDateTime = signal('');
  scheduleObservacao = signal('');
  scheduleError = signal(false);

  pendingPayment = signal<PendingPayment | null>(null);
  paymentValor = signal<number | null>(null);
  paymentObservacao = signal('');
  paymentError = signal(false);

  historyEventId = signal<string | null>(null);
  newActivityText = signal('');

  view = signal<ViewMode>('board');
  calendarMonth = signal<Date>(new Date());

  loginUsername = signal('');
  loginPassword = signal('');
  loginError = signal(false);

  constructor(public store: EventStorageService, public auth: AuthService) {}

  submitLogin(): void {
    const ok = this.auth.login(this.loginUsername(), this.loginPassword());
    if (!ok) {
      this.loginError.set(true);
      return;
    }
    this.loginError.set(false);
    this.loginUsername.set('');
    this.loginPassword.set('');
  }

  logout(): void {
    this.auth.logout();
  }

  scheduledEvents = computed(() => this.store.events().filter((e) => !!e.dataAgendamento));

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }

  calendarDays = computed<CalendarDay[]>(() => {
    const month = this.calendarMonth();
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // semana começa na segunda
    const start = new Date(year, m, 1 - startOffset);
    const todayStr = this.today();
    const scheduled = this.scheduledEvents();

    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dStr = this.toDateStr(d);
      days.push({
        date: d,
        dateStr: dStr,
        inMonth: d.getMonth() === m,
        isToday: dStr === todayStr,
        events: scheduled.filter((e) => (e.dataAgendamento ?? '').slice(0, 10) === dStr),
      });
    }
    return days;
  });

  monthLabel(): string {
    const label = this.calendarMonth().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  prevMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToToday(): void {
    this.calendarMonth.set(new Date());
  }

  scheduleTime(ev: KanbanEvent): string {
    if (!ev.dataAgendamento) return '';
    return new Date(ev.dataAgendamento).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  isScheduleOverdue(ev: KanbanEvent): boolean {
    return ev.status === 'Visita Agendada' && !!ev.dataAgendamento && ev.dataAgendamento.slice(0, 10) < this.today();
  }

  historyEvent = computed(() => this.store.events().find((e) => e.id === this.historyEventId()) ?? null);

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  isOverdue(ev: KanbanEvent): boolean {
    return ev.status !== 'Finalizado' && !!ev.dataPrevista && ev.dataPrevista < this.today();
  }

  formatCurrency(value: number): string {
    return formatCurrencyMT(value);
  }

  saldoPendente(ev: KanbanEvent): number {
    return saldoPendente(ev);
  }

  responsavelOptions = computed(() => {
    const set = new Set(this.store.events().map((e) => e.responsavel).filter(Boolean));
    return Array.from(set).sort();
  });

  overdueCount = computed(() => this.store.events().filter((e) => this.isOverdue(e)).length);

  activeFilterCount = computed(() => {
    let n = 0;
    if (this.filterResponsavel()) n++;
    if (this.filterPrioridade()) n++;
    if (this.filterStatuses().size > 0) n++;
    if (this.onlyOverdue()) n++;
    return n;
  });

  clearFilters(): void {
    this.filterResponsavel.set('');
    this.filterPrioridade.set('');
    this.filterStatuses.set(new Set());
    this.onlyOverdue.set(false);
    this.searchTerm.set('');
  }

  toggleStatusFilter(status: EventStatus): void {
    this.filterStatuses.update((current) => {
      const next = new Set(current);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  isStatusFilterActive(status: EventStatus): boolean {
    return this.filterStatuses().has(status);
  }

  filteredEvents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const resp = this.filterResponsavel();
    const prio = this.filterPrioridade();
    const statuses = this.filterStatuses();
    const overdueOnly = this.onlyOverdue();
    const all = this.store.events();

    return all.filter((e) => {
      if (term) {
        const matchesTerm =
          e.titulo.toLowerCase().includes(term) ||
          e.responsavel.toLowerCase().includes(term) ||
          e.descricao.toLowerCase().includes(term) ||
          e.clienteNome.toLowerCase().includes(term);
        if (!matchesTerm) return false;
      }
      if (resp && e.responsavel !== resp) return false;
      if (prio && e.prioridade !== prio) return false;
      if (statuses.size > 0 && !statuses.has(e.status)) return false;
      if (overdueOnly && !this.isOverdue(e)) return false;
      return true;
    });
  });

  eventsByStatus(status: EventStatus): KanbanEvent[] {
    return this.filteredEvents().filter((e) => e.status === status);
  }

  private csvEscape(value: string): string {
    const v = (value ?? '').replace(/"/g, '""');
    return `"${v}"`;
  }

  exportCsv(): void {
    const rows = this.filteredEvents();
    const headers = [
      'Titulo',
      'Descricao',
      'Cliente',
      'Contacto Cliente',
      'Endereco Cliente',
      'Responsavel',
      'Data Prevista',
      'Prioridade',
      'Status',
      'Atrasado',
      'Valor Orcamento',
      'Condicao Pagamento',
      'Saldo Pendente',
      'Data Agendamento',
    ];
    const lines = [headers.join(';')];
    for (const e of rows) {
      lines.push(
        [
          this.csvEscape(e.titulo),
          this.csvEscape(e.descricao),
          this.csvEscape(e.clienteNome),
          this.csvEscape(e.clienteContacto),
          this.csvEscape(e.clienteEndereco),
          this.csvEscape(e.responsavel),
          this.csvEscape(e.dataPrevista),
          this.csvEscape(e.prioridade),
          this.csvEscape(e.status),
          this.csvEscape(this.isOverdue(e) ? 'Sim' : 'Não'),
          this.csvEscape(e.valorOrcamento != null ? String(e.valorOrcamento) : ''),
          this.csvEscape(e.condicaoPagamento ?? ''),
          this.csvEscape(this.saldoPendente(e) > 0 ? String(this.saldoPendente(e)) : ''),
          this.csvEscape(e.dataAgendamento ?? ''),
        ].join(';')
      );
    }
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = this.today();
    a.href = url;
    a.download = `eventos-kanban-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  connectedDropLists(): string[] {
    return this.columns.map((c) => 'drop-' + c);
  }

  dropId(status: EventStatus): string {
    return 'drop-' + status;
  }

  onDrop(event: CdkDragDrop<KanbanEvent[]>, status: EventStatus): void {
    if (event.previousContainer === event.container) {
      const ids = [...event.container.data].map((e) => e.id);
      moveItemInArray(ids, event.previousIndex, event.currentIndex);
      this.store.reorderWithinStatus(ids, status);
      return;
    }

    const movedEvent = event.previousContainer.data[event.previousIndex];

    if (status === 'Visita Agendada') {
      // O agendamento exige data/hora combinada com o cliente, não apenas mudar de coluna.
      this.scheduleDateTime.set(movedEvent.dataAgendamento ? movedEvent.dataAgendamento.slice(0, 16) : '');
      this.scheduleObservacao.set('');
      this.scheduleError.set(false);
      this.pendingSchedule.set({ id: movedEvent.id, titulo: movedEvent.titulo });
      return;
    }

    if (status === 'Aprovado') {
      // A aprovação segue os termos acordados (valor + condição de pagamento), não apenas a palavra.
      this.approvalValor.set(movedEvent.valorOrcamento ?? null);
      this.approvalCondicao.set(movedEvent.condicaoPagamento ?? '');
      this.approvalObservacao.set('');
      this.approvalError.set(false);
      this.pendingApproval.set({ id: movedEvent.id, titulo: movedEvent.titulo });
      return;
    }

    if (status === 'Finalizado' && this.saldoPendente(movedEvent) > 0) {
      // Só pagou o sinal de 60% — falta confirmar o pagamento do saldo antes de finalizar.
      this.paymentValor.set(this.saldoPendente(movedEvent));
      this.paymentObservacao.set('');
      this.paymentError.set(false);
      this.pendingPayment.set({ id: movedEvent.id, titulo: movedEvent.titulo });
      return;
    }

    this.moveReason.set('');
    this.moveReasonError.set(false);
    this.pendingMove.set({
      id: movedEvent.id,
      titulo: movedEvent.titulo,
      from: movedEvent.status,
      to: status,
    });
  }

  moveModalTitle(pm: PendingMove): string {
    return pm.from === 'Finalizado' ? 'Motivo da reabertura' : 'Motivo da mudança';
  }

  confirmMove(): void {
    const pm = this.pendingMove();
    if (!pm) return;
    const motivo = this.moveReason().trim();
    if (!motivo) {
      this.moveReasonError.set(true);
      return;
    }
    this.store.moveToStatus(pm.id, pm.to, motivo);
    this.pendingMove.set(null);
    this.moveReason.set('');
    this.moveReasonError.set(false);
  }

  cancelMove(): void {
    this.pendingMove.set(null);
    this.moveReason.set('');
    this.moveReasonError.set(false);
  }

  confirmApproval(): void {
    const pa = this.pendingApproval();
    if (!pa) return;
    const valor = this.approvalValor();
    const condicao = this.approvalCondicao();
    if (!valor || valor <= 0 || !condicao) {
      this.approvalError.set(true);
      return;
    }
    this.store.approveBudget(pa.id, valor, condicao, this.approvalObservacao());
    this.cancelApproval();
  }

  cancelApproval(): void {
    this.pendingApproval.set(null);
    this.approvalValor.set(null);
    this.approvalCondicao.set('');
    this.approvalObservacao.set('');
    this.approvalError.set(false);
  }

  confirmSchedule(): void {
    const ps = this.pendingSchedule();
    if (!ps) return;
    const dt = this.scheduleDateTime();
    if (!dt) {
      this.scheduleError.set(true);
      return;
    }
    this.store.scheduleVisit(ps.id, new Date(dt).toISOString(), this.scheduleObservacao());
    this.cancelSchedule();
  }

  cancelSchedule(): void {
    this.pendingSchedule.set(null);
    this.scheduleDateTime.set('');
    this.scheduleObservacao.set('');
    this.scheduleError.set(false);
  }

  confirmPayment(): void {
    const pp = this.pendingPayment();
    if (!pp) return;
    const valor = this.paymentValor();
    if (!valor || valor <= 0) {
      this.paymentError.set(true);
      return;
    }
    this.store.confirmFinalPayment(pp.id, valor, this.paymentObservacao());
    this.cancelPayment();
  }

  cancelPayment(): void {
    this.pendingPayment.set(null);
    this.paymentValor.set(null);
    this.paymentObservacao.set('');
    this.paymentError.set(false);
  }

  openHistory(ev: KanbanEvent): void {
    this.historyEventId.set(ev.id);
    this.newActivityText.set('');
  }

  closeHistory(): void {
    this.historyEventId.set(null);
    this.newActivityText.set('');
  }

  addActivity(): void {
    const id = this.historyEventId();
    if (!id) return;
    this.store.addActivity(id, this.newActivityText());
    this.newActivityText.set('');
  }

  sortedHistory(ev: KanbanEvent): HistoryEntry[] {
    const list = Array.isArray(ev.historico) ? ev.historico.filter((h): h is HistoryEntry => !!h) : [];
    return [...list].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  }

  lastHistoryEntry(ev: KanbanEvent): HistoryEntry | null {
    const sorted = this.sortedHistory(ev);
    return sorted.length ? sorted[0] : null;
  }

  summaryGroups = computed<StatusSummary[]>(() => {
    const all = this.filteredEvents();
    return this.columns.map((status) => ({
      status,
      events: all.filter((e) => e.status === status),
    }));
  });

  summaryReason(ev: KanbanEvent): string {
    const h = this.lastHistoryEntry(ev);
    if (!h) return '—';
    return h.texto?.trim() ? h.texto : this.historyLabel(h);
  }

  historyLabel(h: HistoryEntry): string {
    if (h.tipo === 'status') return `${h.deStatus} → ${h.paraStatus}`;
    if (h.tipo === 'aprovacao') return 'Orçamento aprovado';
    if (h.tipo === 'agendamento') return 'Visita agendada';
    if (h.tipo === 'pagamento') return 'Pagamento final confirmado';
    if (h.tipo === 'criacao') return 'Registo criado';
    return 'Atividade diária';
  }

  openNewForm(status: EventStatus = 'Folha de Obra'): void {
    this.editingId.set(null);
    this.form.set({ ...emptyForm(), status });
    this.formError.set(false);
    this.showForm.set(true);
  }

  openEditForm(ev: KanbanEvent): void {
    this.editingId.set(ev.id);
    this.form.set({
      titulo: ev.titulo,
      descricao: ev.descricao,
      clienteNome: ev.clienteNome,
      clienteContacto: ev.clienteContacto,
      clienteEndereco: ev.clienteEndereco,
      responsavel: ev.responsavel,
      dataPrevista: ev.dataPrevista,
      prioridade: ev.prioridade,
      status: ev.status,
      valorOrcamento: ev.valorOrcamento ?? null,
    });
    this.formError.set(false);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set(false);
  }

  setField<K extends keyof NewEventForm>(field: K, value: NewEventForm[K]): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  saveForm(): void {
    const f = this.form();
    if (!f.titulo.trim()) {
      this.formError.set(true);
      return;
    }

    const payload = {
      titulo: f.titulo,
      descricao: f.descricao,
      clienteNome: f.clienteNome,
      clienteContacto: f.clienteContacto,
      clienteEndereco: f.clienteEndereco,
      responsavel: f.responsavel,
      dataPrevista: f.dataPrevista,
      prioridade: f.prioridade,
      status: f.status,
      valorOrcamento: f.valorOrcamento ?? undefined,
    };

    const id = this.editingId();
    if (id) {
      this.store.update(id, payload);
    } else {
      this.store.add(payload);
    }
    this.closeForm();
  }

  deleteEvent(id: string): void {
    if (confirm('Apagar este evento?')) {
      this.store.remove(id);
    }
  }

  priorityClass(p: EventPriority): string {
    return 'prio-' + p.toLowerCase().replace('é', 'e');
  }

  columnClass(status: EventStatus): string {
    switch (status) {
      case 'Pendente':
        return 'col-pendente';
      case 'Folha de Obra':
        return 'col-folha-obra';
      case 'Por Agendar':
        return 'col-por-agendar';
      case 'Visita Agendada':
        return 'col-visita-agendada';
      case 'Orçamento':
        return 'col-orcamento';
      case 'Aprovado':
        return 'col-aprovado';
      case 'Em Execução':
        return 'col-execucao';
      case 'Pendente de Pagamento':
        return 'col-pendente-pagamento';
      case 'Finalizado':
        return 'col-finalizado';
      default:
        return 'col-folha-obra';
    }
  }
}
