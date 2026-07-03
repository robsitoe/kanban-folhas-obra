-- Aperta as permissões: só quem tiver sessão iniciada (Supabase Auth)
-- pode ler/escrever na tabela. Corre isto DEPOIS de confirmar que o
-- login funciona (SQL Editor -> New query -> colar -> Run).

drop policy if exists "eventos_select_all" on public.eventos;
create policy "eventos_select_authenticated" on public.eventos
  for select using (auth.role() = 'authenticated');

drop policy if exists "eventos_insert_all" on public.eventos;
create policy "eventos_insert_authenticated" on public.eventos
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "eventos_update_all" on public.eventos;
create policy "eventos_update_authenticated" on public.eventos
  for update using (auth.role() = 'authenticated');

drop policy if exists "eventos_delete_all" on public.eventos;
create policy "eventos_delete_authenticated" on public.eventos
  for delete using (auth.role() = 'authenticated');
