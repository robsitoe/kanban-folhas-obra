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
- **Alojado online no Vercel**: https://kanban-folhas-obra-nu.vercel.app/
  (deploy automático a cada `git push`).
- **APK Android gerado** (Bubblewrap/TWA), em `com.mavigas.folhasobra`.
  - Projeto de build: pasta `twa-build/` (não vai para o Git — está no
    `.gitignore` porque contém a chave de assinatura).
  - Ficheiro instalável: `kanban-folhas-obra.apk` na raiz do projeto
    (também fora do Git — é um binário, guarda-se localmente).
  - Credenciais da keystore (necessárias para gerar futuras atualizações
    do mesmo app): `twa-build/CREDENCIAIS-KEYSTORE.txt` (só neste
    computador — **faça backup deste ficheiro nalgum sítio seguro**, se
    se perder não é possível atualizar o app já instalado, só publicar
    como app novo).
  - Para gerar de novo (ex: depois de mudar o manifest.webmanifest):
    `cd twa-build && node generate.js` (regenera o projeto, mantém a
    keystore existente) e depois `./gradlew.bat assembleRelease` +
    zipalign + apksigner (ver histórico de comandos ou pedir ao Claude).

## Por fazer (pela ordem combinada)

1. **Notificações**: visitas agendadas, pagamentos pendentes, atividades
   diárias registadas. Requer configurar VAPID keys + Supabase Edge
   Function para disparar os avisos.
2. (Opcional, discutido) Criar utilizadores adicionais no Supabase Auth
   para a equipa (Gilberto, Joia, Youra Eunice), em vez de um único login.
3. (Opcional) Publicar o .apk na Play Store — requer conta de developer
   Google (~25 USD, pagamento único) e passar pelo processo de revisão.

## Como correr localmente

```bash
npm install
npm start
```

Abre em http://localhost:4200 — precisa de sessão iniciada (Supabase Auth)
para ver os dados.
