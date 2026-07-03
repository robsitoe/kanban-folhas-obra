-- Esquema da base de dados para o Kanban de Folhas de Obra (Mavi-Gás).
-- Corre isto uma vez no Supabase: SQL Editor -> New query -> colar -> Run.

create table if not exists public.eventos (
  id text primary key,
  titulo text not null,
  descricao text not null default '',
  cliente_nome text not null default '',
  cliente_contacto text not null default '',
  cliente_endereco text not null default '',
  responsavel text not null default '',
  data_prevista date,
  prioridade text not null,
  status text not null,
  criado_em timestamptz not null default now(),
  historico jsonb not null default '[]'::jsonb,
  valor_orcamento numeric,
  condicao_pagamento text,
  data_agendamento timestamptz,
  ordem integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Mantém updated_at atualizado automaticamente em cada alteração.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_eventos_updated_at on public.eventos;
create trigger trg_eventos_updated_at
  before update on public.eventos
  for each row execute function public.set_updated_at();

-- Ativa Row Level Security e permite acesso total à app (chave anon).
-- Uso interno da equipa; se mais tarde quiser exigir login, troca estas
-- políticas por regras baseadas em auth.uid().
alter table public.eventos enable row level security;

drop policy if exists "eventos_select_all" on public.eventos;
create policy "eventos_select_all" on public.eventos for select using (true);

drop policy if exists "eventos_insert_all" on public.eventos;
create policy "eventos_insert_all" on public.eventos for insert with check (true);

drop policy if exists "eventos_update_all" on public.eventos;
create policy "eventos_update_all" on public.eventos for update using (true);

drop policy if exists "eventos_delete_all" on public.eventos;
create policy "eventos_delete_all" on public.eventos for delete using (true);

-- Ativa a publicação de tempo real, para sincronizar o quadro entre dispositivos.
alter publication supabase_realtime add table public.eventos;
