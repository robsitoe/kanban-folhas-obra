-- Aperta as permissões: só quem tiver sessão iniciada (Supabase Auth)
-- pode ler/escrever na tabela. Corre isto DEPOIS de confirmar que o
-- login funciona (SQL Editor -> New query -> colar -> Run).

-- Remove TODAS as políticas existentes na tabela (sejam quais forem os
-- nomes), para evitar conflitos com execuções anteriores.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'eventos'
  loop
    execute format('drop policy %I on public.eventos', pol.policyname);
  end loop;
end $$;

create policy "eventos_select_authenticated" on public.eventos
  for select using (auth.role() = 'authenticated');

create policy "eventos_insert_authenticated" on public.eventos
  for insert with check (auth.role() = 'authenticated');

create policy "eventos_update_authenticated" on public.eventos
  for update using (auth.role() = 'authenticated');

create policy "eventos_delete_authenticated" on public.eventos
  for delete using (auth.role() = 'authenticated');
