# Kanban de Eventos — Mavi-Gás

Ferramenta interna simples para gerir eventos/tarefas em formato Kanban, com arrastar-e-soltar real entre colunas **Pendente**, **Por Realizar** e **Concluído**.

## Como correr

Precisas de Node.js instalado (versão 18 ou superior).

```bash
npm install
npm start
```

Depois abre o browser em: http://localhost:4200

## Como usar

- **+ Novo evento** (topo) ou **+ Adicionar cartão** (dentro de cada coluna) para criar um evento.
- Clica e arrasta um cartão para mudar de coluna (Pendente -> Por Realizar -> Concluído), ou reordenar dentro da mesma coluna.
- Ícone de lápis no cartão para editar; X para apagar.
- Campo de pesquisa no topo filtra por título, responsável ou descrição.
- Os dados ficam guardados no localStorage do browser — persistem entre sessões, mas são locais a este computador/browser. Não há servidor nem base de dados.

### Filtros

- Botão **Filtros** no topo abre um painel para filtrar por Responsável, Prioridade e "Só atrasados".
- O número de filtros ativos aparece como bolinha no próprio botão.
- **Limpar filtros** repõe tudo (incluindo a pesquisa de texto).

### Alertas de atraso

- Qualquer evento com Data Prevista anterior a hoje, e que ainda não esteja em "Concluído", fica marcado como **Atrasado** (borda vermelha + selo no cartão).
- No topo aparece uma pastilha vermelha "⚠ N atrasados" — clicar nela ativa automaticamente o filtro "Só atrasados".

### Exportar

- Botão **Exportar** gera um ficheiro CSV (`eventos-kanban-AAAA-MM-DD.csv`) com os eventos atualmente visíveis (respeita os filtros e a pesquisa ativos).
- O CSV abre diretamente no Excel (separador `;`, codificação UTF-8 com BOM para acentos corretos).

## Build para produção (ficheiros estáticos)

```bash
npm run build
```

Os ficheiros ficam em `dist/kanban-eventos/browser`. Podes hospedar essa pasta em qualquer servidor estático, ou até abrir localmente, sem precisar de Node a correr.

## Estrutura

```
src/app/
  models/event.model.ts               # tipos de dados
  services/event-storage.service.ts   # persistencia local + logica de estado
  app.component.ts                    # logica do board + drag-and-drop
  app.component.html                  # template do board
  app.component.css                   # estilos
```

## Proximos passos possiveis (se quiseres evoluir)

- Trocar localStorage por uma API/backend (Node + Postgres) para partilhar o quadro entre colegas (Gilberto, Joia, Youra Eunice) em tempo real.
- Adicionar colunas extra (ex: "Em Atraso") ou etiquetas por cliente/entidade (Mavi-Gás, Empazol, Gás Solution).
- Exportar o board para Excel/PDF.
