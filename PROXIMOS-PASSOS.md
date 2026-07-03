# Estado do projeto — Kanban de Folhas de Obra (Mavi-Gás)

Este ficheiro existe para retomar o trabalho a partir de outro computador.
Basta clonar o repositório e mostrar este ficheiro ao Claude Code.

## O que já está feito

- App Angular 17 com quadro Kanban de Folhas de Obra (Pendente, Folha de
  Obra, Por Agendar, Visita Agendada, Orçamento, Aprovado, Em Execução,
  Pendente de Pagamento, Finalizado).
- Vistas: Quadro (drag-and-drop), Calendário (visitas agendadas), Resumo
  (tabela tipo Excel, filtrável por estado).
- Histórico completo por folha de obra (mudanças de estado, aprovações,
  agendamentos, pagamentos, atividades diárias).
- PWA instalável (manifest, service worker, ícones, responsivo em mobile).
- Backend: **Supabase** (Postgres + Auth + Realtime) substituiu o
  localStorage — dados partilhados entre dispositivos.
  - Projeto Supabase: `nqknaguxwrphtaoyymax` (URL:
    `https://nqknaguxwrphtaoyymax.supabase.co`).
  - Esquema da tabela: [supabase/schema.sql](supabase/schema.sql).
  - Políticas de segurança (RLS, só autenticados): já corridas —
    [supabase/policies_auth.sql](supabase/policies_auth.sql).
  - Credenciais (URL + anon key) estão em `src/environments/environment.ts`
    (a anon key é pública por natureza, protegida pelo RLS).
- Login real via **Supabase Auth** (email + password), substituindo o
  login simples inicial (admin/admin).
  - Utilizador criado: `roberto.manuelsitoe@gmail.com` (password definida
    diretamente no painel do Supabase, não fica guardada em código).
- Repositório GitHub: https://github.com/robsitoe/kanban-folhas-obra

## Por fazer (pela ordem combinada)

1. **Alojar online** (Vercel ou Netlify) — para ter um link público fixo,
   acessível de qualquer lugar, sem depender do PC ligado.
2. **Gerar .apk** com Bubblewrap, depois de estar online (precisa de um
   URL https real, não funciona com localhost).
3. **Notificações**: visitas agendadas, pagamentos pendentes, atividades
   diárias registadas. Requer configurar VAPID keys + Supabase Edge
   Function para disparar os avisos.
4. (Opcional, discutido) Criar utilizadores adicionais no Supabase Auth
   para a equipa (Gilberto, Joia, Youra Eunice), em vez de um único login.

## Como correr localmente

```bash
npm install
npm start
```

Abre em http://localhost:4200 — precisa de sessão iniciada (Supabase Auth)
para ver os dados.
