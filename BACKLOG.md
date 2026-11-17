# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

Cada item pendente vem com **Por que sobrou**, **O que envolve** e **Posso retomar quando** pra você decidir se vale o esforço.

---

## 🐛 Bugs / Limpeza pendente

### Sugestões do playtest de estética, fluxo e mecânica (2026-11-17, fim do dia)

**✅ Corrigido no mesmo teste:** emblemas próprios pra Championship (tinha Sky Bet), LaLiga 2 (era o logo da LaLiga com Santander) e Liga Portugal 2 (era o logo da 1ª divisão); logos do mercado usavam o endereço remoto (Liga Portugal 404).

**🐛 Bugs pequenos achados (✅ todos corrigidos):**
- ✅ "1º — dentro da meta" nos objetivos da diretoria e "1º NA LIGA" em Meu Clube com 0 jogos (mesmo caso já corrigido na Central).
- ✅ Números de camisa irreais nos jogadores vindos do sync (#116, #117 — "90 + posição na lista").
- ✅ Aba "Meu Clube" abre uma tela chamada "Sala de Troféus".

**🎨 Estética:**
- ✅ Tela inicial: 8 modos com o mesmo peso; o Modo Carreira (carro-chefe) é o 6º, abaixo da dobra. Sugestão: card de destaque "Continuar carreira — Crystal Palace · Rodada 4" no topo e os outros modos agrupados. *Feito: card de destaque com escudo, liga, temporada e rodada no topo (só aparece com carreira salva); agrupar os outros modos ficou pra depois.*
- Táticas como 5 menus de lista: trocar por um campinho com a formação e os titulares (tocar pra trocar).
- Caixa "Análise tática · 4-3-3 é ofensivo" quebra em 3 linhas no celular; cabeçalho espreme "FOOTPLAN / MODO CARREIRA" entre dois botões.
- Elenco: botão laranja "Renovar" nas 29 linhas — destacar só contratos acabando e renovar pelo detalhe do jogador.
- Emblemas próprios ficam miúdos no card pequeno — versão compacta só com o escudo.

**🧭 Fluxo:**
- ✅ Central com ~2200px (3 telas): 12 blocos empilhados. Sugestão: topo fixo com o próximo jogo + "Jogar/Avançar"; o resto em abas ou cards recolhidos. *Feito: próximo jogo no topo; objetivos e FC Hub recolhíveis; conversas só aparecem se houver alguma (~1800px com tudo).*
- ✅ O "Jogar" fica abaixo do bloco de treino/coletiva; inverter (próximo jogo primeiro, preparação logo abaixo, em formato compacto).
- ✅ (sem o artilheiro) Card do próximo jogo sem nada do adversário: mostrar posição, força, últimos 5 jogos e o artilheiro dele.
- ✅ Aviso "Termine a liga e a copa pra avançar de temporada" aparece desde a rodada 1.
- "Confirmar Táticas" aparece na aba Elenco fora da preparação de jogo.
- "Jogar Online · P2P via WebRTC": trocar por "Jogue ao vivo com um amigo pelo código".
- Mercado: liga → time → jogador; sugerir reforços pela posição mais fraca do elenco e uma lista de observação.

**⚙️ Mecânica:**
- Economia sem pressão: ~+€810K/semana (~€30M/temporada) e patrocínio já no nível máximo pra clube de PL. Sugestão: custo de estádio/estrutura, salários que sobem com o desempenho, bônus por objetivo em vez de renda fixa alta.
- Lista do elenco sem fadiga/moral/forma — justamente o que decide escalação; mostrar e permitir rodízio.
- Treino é escolha binária fadiga×moral toda rodada; dar um efeito de médio prazo (ex.: foco tático que melhora um atributo do time por algumas rodadas).
- Dar peso à coletiva/conversas (hoje só moral ±); ex.: promessas de titularidade que, quebradas, viram pedido de transferência.

### Rodada de melhorias de jogo 2026-11-17 (noite)

**✅ Entregue:**
- **Posse de bola** proporcional à força do meio-campo (era "vencedor leva tudo"): posse do dominante mediana 73% → 58%, jogos acima de 75% 45% → 4%; gols/jogo e vitória do mandante praticamente iguais.
- **Notas calibradas por liga** (`ratingCalibration.ts`): Haaland 98 → 90, Van Dijk 94 → 87; níveis em ordem (2ªs divisões abaixo das 1ªs). Idempotente por jogador.
- **Campo 2D** mostra quem está com a bola (anel) e o nome citado no lance.
- **Copa nacional** com fase preliminar entre 10 clubes da outra divisão (5 vagas).
- **Metas do dia**: conquistas por sequência (3, 7 e 30 dias) + próxima recompensa no card.
- **Estatísticas de partida avulsa**: "Jogar de novo" e "Menu principal" (o botão antigo dizia "Escolher Times" e ia pro menu).
- **IDs SportAPI7** das 2ªs divisões conferidos no Sofascore (54, 44, 53, 239).
- **Sem internet** o jogo usa os elencos atuais (`public/rosters-snapshot.json` no precache do PWA; `npm run rosters:bundle`).

**✅ Item 10 (notificações) — feito no app Android (aprovado pelo usuário):** `src/services/reminders.ts` com `@capacitor/local-notifications`: lembrete das metas às 19h e de rodada nova da Liga entre Amigos (00:05 UTC no fuso local, só pra quem participa de alguma liga). Pede permissão na 1ª abertura; chave "Lembrete diário às 19h" no card das metas (só aparece no app). Plugin registrado no projeto Android (`cap sync`), mas **não testado em aparelho** — o SDK Android não está instalado nesta máquina.
- 🟡 Pendente: no navegador/PWA, avisar com o app fechado exige servidor de push (Web Push + VAPID + Edge Function do Supabase agendada).

**📝 Itens 5–8 (Liga entre Amigos v2) — documentados, não feitos por decisão sua:**

- **5. Conta de verdade (não anônima).** Hoje o login anônimo fica preso ao aparelho: trocar de celular ou limpar o navegador perde a vaga na liga e o save na nuvem.
  - *Como:* Supabase Auth com Google e/ou link mágico por e-mail. Usar `linkIdentity` (ou `updateUser({ email })`) no usuário anônimo atual pra **promover** a conta sem perder dados — o `user_id` continua o mesmo, então `careers` e `friend_league_members` seguem valendo.
  - *Telas:* "Salvar minha conta" na Central/Liga entre Amigos; "Entrar" em outro aparelho.
  - *Pré-requisito pra:* sync das metas do dia entre aparelhos e push por usuário (item 10 web).

- **6. Notificação de rodada nova.** Depende do item 10. No Android, lembrete local às 00:05 UTC convertido pro fuso local (desenho pronto acima); na web, Web Push disparado por uma Edge Function agendada (cron) que roda à meia-noite UTC.

- **7. Resultado conferido no servidor.** Hoje qualquer membro grava a rodada (o cliente simula). Entre amigos é aceitável; aberto ao público, não.
  - *Como:* Edge Function `settle-friend-round` (Deno) que importa a engine (`simulateFriendRound` é pura e determinística), roda por cron à meia-noite UTC e grava com a service role; trocar a política "members record rounds" por **só service role**. O cliente para de gravar e só lê.
  - *Alternativa mais barata:* manter o cliente gravando, mas a Edge Function recalcula e confere; se divergir, sobrescreve e registra.

- **8. Elenco e escalação dentro da liga.** Hoje cada um só escolhe a tática (preset); o elenco é o congelado na criação.
  - *Como:* `friend_league_members.lineup jsonb` (11 titulares + formação) e, opcionalmente, uma janela de trocas entre membros (`friend_league_trades`, aceite das duas partes). A simulação usa o lineup do membro no lugar de `squad.slice(0, 11)`.
  - *Cuidado:* a regra de "semente fixa" continua valendo — o lineup vigente no momento do prazo entra na rodada.

### Rodada "faz tudo" 2026-11-17 (tarde)

**✅ Entregue:**
- Patrocinadores fictícios (eram 60 marcas reais); online com ligas atualizadas, time inteiro no protocolo e sem SIMULAR.
- Worker: allowlist publicado (antes repassava qualquer rota pra API paga) + cache de 6h na borda (o rate limit nativo/em memória não segura; o cache protege a cota).
- Copa nacional com as duas divisões do país e travada pelo calendário; as 12 ligas da carreira com elencos atualizados.
- SportAPI7 descobre a temporada atual sozinho e mapeia as 6 segundas divisões.
- Botão "Avançar" único na Central; ticker com placares ao vivo (reais) dos outros jogos; campo 2D na partida.
- Categorias de base com potencial escondido + estimativa do olheiro; metas do dia com sequência 🔥.
- Liga entre Amigos assíncrona (uma rodada por dia, Supabase com RLS).

**⏳ Pendente (depende de você ou de cota):**
- **AAB:** instalar o Android SDK (não existe na máquina) e gerar a keystore; usar JDK 21 (ver GUIA §4).
- **SportAPI7:** cota MENSAL estourada (plano BASIC) — os ut de LaLiga 2 (54), 2. Bundesliga (44), Serie B (53) e Liga Portugal 2 (239) ainda não foram confirmados.
- **Repositório GitHub público** com licença proprietária — decidir se fica privado.
- **E-mail pessoal** nas páginas de privacidade/termos.
- **Projeto antigo do Supabase** (`avpxvmiausfqyscomocg`) ainda ativo com escrita aberta.
- **Posse da engine** às vezes extrema (80–87% pra um lado) — calibração do motor.
- **Liga entre Amigos v1:** login anônimo por aparelho (trocar de celular perde a vaga); resultado gravado por qualquer membro sem verificação no servidor; sem notificação push de rodada nova.
- Tela de estatísticas do Jogo Rápido sem botão de voltar ao menu.

### Playtest mobile 2026-11-17 (Modo Carreira, Crystal Palace, 375px)

**✅ Corrigidos no mesmo dia:**
- **"Continuar" no fim de partida ao vivo descartava o resultado.** Só "📊 Estatísticas" gravava; "Continuar <liga/copa>" chamava `handleContinueTournament`, que só troca de tela. Afetava Carreira, Campeonatos e Copas. Agora `handleContinueFromMatch` grava e segue. Teste em `AppScreens.test.ts`.
- **Overlays `position: fixed` (pausa, intervalo, modais) fora da tela no celular.** `.screen-fade` tinha `will-change: transform` permanente, que vira containing block dos `fixed`; o overlay ficava com a altura da página e o painel abaixo da dobra.

**🔴 Pendentes — dados:**
- ✅ ~~Composição das ligas congelada em 2024/25; Ipswich na PL e na Championship ao mesmo tempo.~~ Corrigido (`defd86e`): `buildLeagueFromRemote` troca rebaixados por promovidos quando a resposta é a liga inteira. Sync de 2026-11-17 aplicou nas 7 ligas da football-data (PL ganhou Coventry, Hull, Leeds, Sunderland…; West Ham e Wolves foram pra Championship; Ipswich só numa liga). As 5 segundas divisões da API-Football atualizam quando a cota permitir. *Fallback offline (dados estáticos) continua 2024/25.*
- ✅ ~~Notas infladas/comprimidas; jogador novo do sync com atributos genéricos (goleiro reserva com finalização 72, titular por acaso).~~ Corrigido: jogador real desconhecido nasce abaixo da média conforme perfil (base −7/−12, goleiro extra −4) e com variação ±3 (era ±9, inventava craques); goleiro gerado com atributos de goleiro. PL passou de 84–90 pra 71–89; Henderson voltou a titular do Palace.
  - 🟡 Ainda pendente: calibração dos jogadores **conhecidos** no estático ainda puxa pra cima (Sarr 88). Recalibrar exige uma fonte de nota real por jogador.
- ✅ ~~Estádio inventado e incoerente entre telas.~~ Corrigido: sync grava o estádio real (`venue` da football-data; nome + capacidade da API-Football) e as duas telas usam `teamStadium`. Sem dado real: nome estável por clube, sem capacidade inventada. 7 ligas já com estádio real (Selhurst Park, Emirates…); capacidade só virá das 5 segundas divisões (API-Football).
- ✅ **Achado no caminho: cache local de 7 dias vencia o snapshot publicado.** Quem já tinha aberto o jogo ficava até uma semana com ligas/elencos antigos (e com sync diário, o cache sempre ganhava). Agora o cache só vence se for mais novo que o snapshot, ou offline. Testes em `rosterSync.test.ts`.

**Teste dos outros modos (2026-11-17):** Campeonatos e Copas OK (resultado ao vivo gravado; pênaltis aparecem como "a.e.t. · Pên. 7–6"). Online corrigido:
- ✅ Online usava as ligas estáticas de 2024/25 e trocava só o id do time — com snapshots de dias diferentes cada lado simulava com elenco diferente. Agora o lobby usa as ligas atualizadas, guarda o objeto do time escolhido e o `start` leva os times do host.
- ✅ "SIMULAR" no online não avisava o guest (ficava preso em "Aguardando host simular"). Removido do online.
- 🟡 Posse da engine às vezes extrema (80%×20% em Arsenal × Chelsea). Calibração do motor, não de exibição.
- 🟡 Logo da Championship traz a marca Sky Bet (patrocinador). Trocar exige outra imagem.

**🟡 Pendentes — bugs:**
- ✅ ~~"Simular até o fim" dispara dezenas de `Maximum update depth exceeded` e a narração para no minuto em que se pulou.~~ Corrigido (`a7698df`): era pior que parecia — pular **encerrava a partida no minuto do clique** (engine gera eventos sob demanda). Agora simula o resto; o loop vinha do setter instável do `useLocalStorage` (histórico enchia de cópias).
- ✅ ~~Pênaltis invisíveis: 1-1 na copa vira "DERROTA" sem mostrar a disputa.~~ Corrigido: o SIMULAR em mata-mata descartava prorrogação/pênaltis e **dava a vaga sempre ao visitante** nos pênaltis. Lógica movida pra `simularMataMataCompleto` (engine) com teste.
- ✅ ~~Placar do jogo (1-1) diferente do ticker da rodada (0-1); posse 8% × 91%.~~ Corrigido: o ticker **inventava** placares (Math.random, inclusive pro jogo do usuário) que não eram os gravados; agora mostra só resultado real e some se não houver. Posse ao vivo/intervalo contava linhas de narração; agora usa a posse da engine (`possessionPct`). *Ideia de feature:* ticker com placares ao vivo de verdade (pré-simular a rodada e revelar no relógio, estilo FM).
- ✅ ~~Ícone ⚡ do treino mostra delta de **fadiga** mas lê como energia.~~ Corrigido: agora "Fadiga +25 · Moral +3", por extenso, verde/vermelho conforme bom/ruim.
- ✅ ~~Primeiro jogo da temporada é a copa; com 0 jogos o time aparece "1º lugar" e o feed comemora; jogo de copa não conta em JOGOS.~~ Corrigido: fases das copas espalhadas pela temporada (`cupSchedule.ts`: na PL, oitavas após a rodada 7, final após a 30; continental meio passo antes); "Pré-temporada" até o 1º jogo; feed sem post de tabela antes disso; tile "Jogos na liga".
  - 🟡 Ainda pendente: a copa doméstica só tem os 16 primeiros times da própria liga (sem 2ª divisão, sem fases anteriores). Pela tela da copa dá pra jogar a fase antes de ela "abrir" no calendário.
- ✅ ~~4 cliques pra começar uma partida (Jogar → Confirmar → Iniciar Partida → JOGAR).~~ Agora 3: a pré-partida tem "⚡ Simular" e "▶ Jogar ao vivo" e a partida começa sozinha no modo escolhido. *Próximo passo possível:* um "Avançar" único estilo FM que pula a tela de táticas quando nada mudou.
- ✅ ~~PT-PT misturado ("noutra liga"); botões de time sem nome acessível.~~ Corrigido: "em outra liga" (varredura não achou outros termos de PT-PT na interface); botões de time com `aria-label` ("Crystal Palace, força 84"), `aria-pressed` e escudo decorativo (`alt=""`) em carreira/torneio, seleção, online e troca.

### ✅ Pênaltis: narração fora de ordem + crash potencial + lookup de fadiga frágil — CORRIGIDO (2026-09)

**O que era:** três defeitos no fluxo de pênaltis do `matchEngine.ts`:
1. **Narração não batia com a simulação** — o log de eventos recomputava o cobrador com `Math.floor(idx/2) % len`, que diverge da simulação na morte súbita (a rodada continua de 5 em diante). O feed narrava um jogador diferente do que realmente chutou.
2. **Crash potencial** — com todos os jogadores de linha expulsos, `i % 0` virava NaN e `takePenalty(undefined)` crashava em `shooter.attributes`.
3. **Lookup de fadiga frágil** — o pênalti durante o jogo buscava fadiga em `fatigueHome.get(id) ?? fatigueAway.get(id)` em vez do mapa do time correto (só funcionava porque ids de jogador são únicos entre times).

**Correção.** `PenaltyResult.kicks` agora registra o `shooterId` de cada cobrança (simulação e overlay interativo), e o log de eventos usa esse id em vez de recomputar o índice. Guarda no início de `simularPenaltisInterno` para time sem cobradores (perde por W.O., sem crash). Fadiga do pênalti em jogo usa o mapa do time correto. 2 testes de regressão novos em `matchEngine.test.ts` (cobrador narrado = cobrador simulado, incl. morte súbita; e sobrevivência sem jogadores de linha). Suíte: 591 testes, 0 falhas.

### ✅ Cloud Save falha em silêncio absoluto — CORRIGIDO (2026-08-04)

**Por que sobrou:** encontrado na revisão de docs de 2026-07-31, ao investigar uma contradição entre `BACKLOG.md` e `STATE.md` sobre a tabela Supabase.

**O que envolvia:** `useCloudSave` já expunha `status` (`'saving' | 'saved' | 'offline'`) e `retry`, mas `useCareerManager` só consumia `loadFromCloud` e `enqueueCloudSave`. Nenhuma tela lia o status. Se o save na nuvem falhasse — tabela ausente, credencial errada, rede caída — o usuário nunca ficava sabendo.

**Correção.** `useCareerManager` passou a expor `cloudStatus`/`retryCloudSave`, threadados por `App.tsx` → `AppScreens.tsx` até a `CareerHubScreen`, que agora mostra um indicador discreto de backup na nuvem: `saving`/`saved` em cinza, `offline` em âmbar com botão **"Tentar de novo"** (chama o `retry` que já existia). `idle`/`loading` não renderizam nada — sem ruído pra quem joga offline (sem Supabase configurado). 4 testes novos em `CareerHubScreen.test.tsx` cobrem os quatro estados. Suíte: 564 testes, 0 falhas.

> Contexto: a config do Supabase foi verificada ao vivo em 2026-08-04 — RLS ligado nas duas tabelas, `careers` com policy "own career" (`user_id = auth.uid()`), `roster_snapshots` com read aberto e write `ALL` a anônimo (decisão em aberto, ver diagnóstico de produção).

### 🟡 Elenco ao vivo pode vir com jogador no clube errado (limitação do provedor)

**Por que sobrou:** não é bug nosso. Verificado em 2026-07-31 chamando `fetchCompetitionTeams('pl')` direto e inspecionando a resposta crua: a football-data.org lista Illan Meslier como goleiro do Arsenal antes de qualquer código do FootPlan tocar o dado.

**O que envolve:** mitigar exigiria heurística (ex: "descartar goleiro além de N por time"), com risco de cortar elenco legítimo. Alternativa mais segura seria cruzar com uma segunda fonte antes de aceitar, o que multiplica chamadas e cota.

**Posso retomar quando:** só se virar incômodo real. Os dois defeitos *internos* que existiam já foram corrigidos (`cc0e8ec`, `d14d70b`).

### 🟡 Re-sincronizar elencos no Supabase — 4 segundas divisões (API-Football)

**Estado em 2026-11-17:** `npm run rosters:sync` publicou o snapshot no projeto novo (`dqilznggmhgtonnccsws`) com **8/12 ao vivo**: pl, laliga, serieA, bundesliga, ligue1, ligaPortugal, championship e **ligue2** (antes estática). As outras 4 mantiveram o elenco anterior do snapshot (sintético, 18 por time):

- `bundesliga2`, `serieB`: **limite diário** da API-Football (100/dia). Uma rodada sem a service role mais cedo no mesmo dia gastou parte da cota.
- `laliga2`, `ligaPortugal2`: **403** da API-Football — restrição do plano/conta pra essas competições; esperar não resolve.

**Correção junto (2026-11-17):** num sync forçado, liga que falhava ao vivo voltava com o elenco **estático** e, publicada, sobrescrevia um elenco melhor que já estava no snapshot. Agora `syncAllLeagueRosters` mantém o que o snapshot tinha pra essa liga (`source: 'cloud'`) e devolve `errors` por liga; o script imprime o motivo de cada falha. Teste de regressão em `rosterSync.test.ts`.

**O que envolve:** no dia seguinte (cota reseta), rodar de novo **uma vez só**, com `SUPABASE_SERVICE_ROLE_KEY` no `.env`:

```bash
npm run rosters:sync
```

Pras duas com 403: mapear `laliga2`/`ligaPortugal2` na SportAPI7 (ver item "SportAPI7 — Mapeamento pendente") ou aceitar elenco sintético nelas.

**Posso retomar quando:** a partir de 2026-11-18, ~1 minuto.

---

## 🚀 Produção — checklist do GUIA_PRODUCAO.md

Itens de infra externa que o [GUIA_PRODUCAO.md](GUIA_PRODUCAO.md) lista pro lançamento. Estado marcado conforme **verificável pelo repositório**; o que depende de console/servidor externo fica como "a verificar" com o passo exato.

| # | Item | Estado | Como verificar / o que fazer |
|---|------|--------|------------------------------|
| 1 | **Supabase: fechar RLS de `roster_snapshots`** | ✅ Resolvido (2026-11-17) | Migrado pro projeto `dqilznggmhgtonnccsws` com `scripts/sql/setup-supabase.sql`: só leitura pública no snapshot, escrita anônima testada e bloqueada. Ver GUIA_PRODUCAO.md §1. |
| 2 | **Re-sync global dos elencos** | 🟡 8/12 ao vivo (2026-11-17) | Faltam bundesliga2/serieB (cota diária) e laliga2/ligaPortugal2 (403). Ver item "Re-sincronizar elencos no Supabase" acima. |
| 3 | **Worker: secrets** | ✅ Confirmado (2026-11-17) | O sync de 2026-11-17 trouxe 7 ligas pela football-data.org e respostas da API-Football via proxy — as duas chaves (`FOOTBALL_API_KEY`, `RAPIDAPI_KEY`) estão setadas no Worker. |
| 4 | **Worker: rate limit em produção** | 🟡 Pendente de deploy | O código do rate limit (20 req/min por IP) **já está** em `worker/football-proxy.js`. Falta o `npx wrangler deploy` pra valer. Verificação externa: bater no proxy >20x/min e ver 429 |
| 5 | **PeerServer próprio (multiplayer)** | 🔴 Pendente | `.env` **sem** `VITE_PEER_*` → jogo ainda usa o broker público `0.peerjs.com` (sem SLA). Subir servidor (Render/Fly/Railway ou docker) + rebuild do site com as 4 vars |
| 6 | **Android: keystore de release + AAB** | 🔴 Pendente | `android/keystore.properties` **não existe** (`Test-Path` = False). Sem ele o build.gradle só gera debug. Criar keystore, preencher o properties, `gradlew bundleRelease`, bump de `versionCode`/`versionName` |
| 7 | **Play Store: URL de política de privacidade** | ✅ Pronto | `public/privacy.html` + `public/terms.html` existem e estão linkados na Home (`HomeScreen.tsx:114`). Só falta a URL no formulário de publicação |
| 8 | **Visibilidade de crash** | ✅ Pronto | `ErrorBoundary` com versão + link de issue; `fp:lastCrash` persistido; logs globais com versão (descrito no GUIA_PRODUCAO §5, já em código) |

> **Como manter atualizado:** a cada item concluído, marcar aqui e não reabrir depois. Itens 5 e 6 são os únicos bloqueados por trabalho real (infra nova + keystore/Play).

---

## 🏗️ Saúde do código

### ✅ Refatoração de UI, fluxo e design — 2026-08-10 (concluída)

Resposta a uma análise de código/fluxo/design. **9 melhorias** aplicadas (tudo menos tema claro, adiado a pedido). Detalhe completo em [`REFATORACAO_UI_2026-08.md`](REFATORACAO_UI_2026-08.md).

- **Design system:** tokens semânticos de cor (`--win/--draw/--loss/--positive/--negative/--warning/--text-muted` em `index.css`) substituindo ~20 arquivos com hex solto (zero mudança visual); primitivos em `src/components/ui/` (`Button` com variantes + `glow`, `Card`, `StatTile`, `Icon` SVG); ícones de interface migrados de emoji pra SVG na Central; CTA "hero" (`.start-btn`, 8 telas) consolidado em `<Button glow>` e a classe global removida.
- **Fluxo/layout:** `CareerHubScreen` reorganizada de "God screen" (14 cards empilhados) pra 2 colunas ação×informação, com grid desktop ≥900px; sync de elencos movido pra "Ajustes avançados" recolhível.
- **Arquitetura:** bundle do `useCareerManager` agrupado num único prop `career` (screenProps/`AppScreensProps` caíram de ~90 → ~40 campos); navegação de carreira consolidada num objeto estável `nav` (`CareerNav`); helper de índice de mata-mata deduplicado (`BracketScreen` computa o índice internamente).
- **Performance:** `React.memo` em **todas as 9 telas de carreira** (CareerHub, TransferMarket, JobMarket, SeasonEnd, LeagueTable, LeagueScreen, BracketScreen, TradeProposal, TrophyRoom). TrophyRoom usa comparador custom (o `currentSeason` é comparado por valor). Skips confirmados empiricamente.

Suíte: 573 testes, 0 falhas. `tsc`/`oxlint` limpos.

**Follow-ups não feitos:** tema claro (#10, adiado); dedup profundo dos handlers liga↔carreira nos hooks; estilos inline estáticos restantes em `MatchScreen`/`HalftimePanel`; adoção incremental dos primitivos nas telas ainda não migradas.

### ✅ Auditoria 2026-07-24 — melhoria contínua (concluída)

Todas as 27 melhorias foram aplicadas. Nenhum item pendente.



---

## 📦 Features grandes

### ✅ Mercado de Transferências com dinheiro — CONCLUÍDO

TransferMarketScreen com 4 abas (Comprar Jogadores, Vender Jogadores, Agentes Livres, Propor Troca), avaliação determinística por threshold de valor de mercado, multiplicador via slider, retenção de 20% da diretoria em vendas, histórico de transferências. Busca por nome cobre as 12 ligas; navegação liga → time → jogador com badge da liga corrente no cabeçalho.

### ✅ Cloud Save (Supabase) — CONCLUÍDO no código

Cliente Supabase com auth anônimo, save/load automático em segundo plano, cache offline-first com fallback pra localStorage. O código está ativo: `useCareerManager.ts:82` carrega da nuvem no mount e `:98` enfileira save a cada mudança de estado; `services/cloudSave.ts` faz upsert na tabela `careers`.

> ⚠️ **Contradição entre docs, não resolvida.** Este arquivo afirmava "Tabela `careers` criada no projeto Supabase", enquanto `.planning/STATE.md` afirmava "CloudSave removido do Hub (tabela Supabase nunca foi criada)". A parte de "removido do Hub" **é verdadeira** — não existe botão de nuvem na `CareerHubScreen`. Já a existência da tabela é infra externa, impossível de verificar pelo repositório. **Confirmar no painel do Supabase.**
>
> **Se a tabela não existir, a falha é 100% silenciosa.** Verificado no código: `useCloudSave.ts:30` captura o erro e seta `status: 'offline'`, mas `useCareerManager.ts:66` só extrai `loadFromCloud` e `enqueueCloudSave` — **nunca lê `status`**, e nunca chama `retry`. Ou seja, nenhum ponto da UI mostra que o backup em nuvem está falhando. O usuário acredita ter save na nuvem e não tem.

### 🟡 SportAPI7 — Mapeamento pendente (4 ligas)

**Por que sobrou:** cota mensal gratuita da SportAPI7 (RapidAPI) estourou durante desenvolvimento. Faltam os `uniqueTournament` IDs de La Liga 2, 2. Bundesliga, Serie B e Liga Portugal 2.

**O que envolve:** quando a cota resetar (**1º de agosto de 2026**), descobrir os IDs via `GET /category/{N}/scheduled-events/2026-04-26` e preencher `LEAGUE_MAP` em `src/services/sportApi.ts`.

**Já feito (2026-09):** a rota de discovery `category/{N}/scheduled-events/{date}` foi liberada no allowlist do worker proxy (`worker/football-proxy.js`) — agora dá pra descobrir os IDs via proxy (que tem a chave RapidAPI) em vez de depender de console externo. Falta só: `npx wrangler deploy` do worker + descobrir os IDs + preencher `LEAGUE_MAP`.

**Posso retomar quando:** a partir de 1º de agosto de 2026 — 10 minutos pra resolver.

---

## ✅ Já entregue (referência)

- **Modo Carreira — Squad Management**: escalação visual (`SquadManagementScreen` + `FormationPitch`), clique-a-clique pra trocar titular/reserva da mesma posição, troca de formação preserva quem já é titular e nunca escala suspenso/lesionado
- **Modo Carreira — Fadiga e Cartões**: desgaste real persiste entre partidas (antes `currentFatigue` era escrito mas nunca lido de volta após o jogo), 3 amarelos na temporada ou 1 vermelho direto suspendem por 1 jogo, liberado ao avançar rodada/estágio
- **Modo Carreira — Finanças e Inbox**: orçamento inicial por liga, folha salarial pelo valor de mercado do elenco, renda semanal, caixa de entrada com mensagens obrigatórias (lesão) bloqueando "Avançar Rodada" até serem lidas
- **Modo Carreira — Sala de Troféus**: histórico de temporada enriquecido (artilheiro, W/D/L, gols, delta de orçamento, técnico da temporada), `TrophyRoomScreen` com cards expansíveis por ano
- **Partida em texto**: removido o campo visual animado (`Pitch.tsx`) de todas as partidas — placar, posse, momentum, timeline de gols e feed de comentário já cobriam a narração; véspera de jogo agora mostra as formações em texto em vez de diagrama SVG
- **Velocidade de replay recalibrada**: progressão geométrica (1×/2×/4×/8×) em vez de linear — 4x roda um tempo de 45' em ~15s reais, antes eram ~30s
- **Som removido**: `utils/audio.ts` (Web Audio API procedural) e todas as chamadas `sfx.*` tirados — feedback sonoro ainda não estava bom o suficiente
- **Modo Carreira (base)**: progressão multi-temporada (todas as 12 ligas evoluem junto), envelhecimento/evolução de jogadores, mercado de transferências com dinheiro, reputação de técnico, liga+copa disputadas juntas por temporada, histórico de temporadas, save único (`fp:career`)
- **Mobile — tela de liga dividida**: "Ver Liga" era uma tela só misturando classificação + jogo do usuário + outros jogos da rodada (~580px de scroll no celular). Dividida em `LeagueScreen` (dia de jogo) + `LeagueTableScreen` (classificação, consulta pura) — aplicado nos dois modos (Campeonatos e Carreira). Hub da carreira ganhou botão de destaque "⚽ Jogar" que pula direto pra tática do próximo jogo, sem passar pela tela de rodada
- **12 ligas europeias** (6 de 1ª divisão + 6 de acesso: Championship, La Liga 2, 2. Bundesliga, Serie B, Ligue 2, Liga Portugal 2) com elencos gerados por OVR do time e subtipos de posição (CB/FB/CDM/CAM/W/ST)
- **Sincronização de elenco ao vivo** via football-data.org (proxy Cloudflare Worker) + SportAPI7 (Sofascore via RapidAPI) — nomes reais, idades, logos, valores de mercado EUR
- **Mercado de Transferências**: 3 abas (Comprar/Vender/Agentes Livres), slider de multiplicador, retenção de 20% da diretoria, avaliação determinística por threshold
- **OVR por subtipo de posição**: detecção automática de CB/FB/CDM/CM/CAM/W/ST com pesos específicos por função
- **Bônus de elite no OVR**: acima de média ponderada 78, bônus adicional cresce com a distância até o teto (+6) — separa "muito bom" de "referência mundial" sem mexer no OVR de ninguém abaixo disso (zero recalibração necessária em `generatePlayer()`/`calculateMarketValue()`)
- **Fix**: botão de "Iniciar Carreira"/"Iniciar Temporada" ficava clicável durante a sincronização de elenco ao vivo — corrida entre o clique e o fetch podia iniciar a carreira com dados estáticos (sem idade real), fazendo jogadores famosos tipo Lewandowski saírem com idade aleatória em vez da real. Botão agora desabilita até o sync terminar
- **Cloud Save (Supabase)**: auth anônimo, save/load automático, cache offline-first
- **PWA instalável** (manifest, service worker, ícones, safe-area insets pro notch/Dynamic Island no iOS, funciona offline)
- **Persistência de sessão de partida ao vivo** — sobrevive a F5, restaura em pausa
- **Motor de simulação em blocos**: substituições numa pausa do 2º tempo afetam o resto do jogo de verdade
- **5 substituições em até 3 janelas de parada** (não é mais um contador único)
- **3 presets de tática** com tooltips explicativos
- **Fix**: desarme agora muda a posse de fato (antes a narração e o resultado divergiam)
- **Fix**: fadiga recalibrada (sem mais quedas irreais de OVR durante a partida)
- **Fix**: OVR de goleiro gerado proceduralmente calibrado corretamente
- **Fix**: bola segue passador/receptor real do evento, com arco proporcional à distância
- **Fix**: layout mobile — campo, tabela de classificação e botões de nav (`min-width` fixo cortando texto) não estouram mais a tela pequena; `box-sizing: border-box` global elimina scroll vertical fantasma
- **UI**: label "Posse de Bola" padronizado, goleiro com anel na cor do time, jogadores não somem mais ao pausar, banner "Continuar" cobre todos os fluxos de entrada
- **Débito técnico**: removido Redux Toolkit não utilizado; `App.tsx`/`useBracketManager.ts` não importam mais direto do arquivo de dados legado (`data/premierLeague.ts`, agora só usado internamente por `data/leagues/premierLeague.ts`)
- **Performance**: code-splitting (`React.lazy`) de `MatchScreen`, `MatchStatsScreen` e `AchievementsScreen` — bundle inicial ~10.5% menor (gzip); auditoria de touch targets (tooltips, presets de tática, controle de velocidade) pro mínimo recomendado de toque no mobile
- **Testes de UI**: `@testing-library/react` + `jsdom` configurados (ambiente isolado por arquivo, motor continua em `node`); cobertura pras 3 telas de seleção de time, tabela de classificação, tela de estatísticas pós-jogo (artilheiros, melhor em campo, cartões, histórico) e chaveamento de copa (partida do usuário, simular outros, fase de campeão)
- Sistema de conquistas (15 achievements)
- Tema escuro, fade entre telas
- Tela pós-jogo completa (MOTM, notas, gols, cartões, breakdown tático)
- Tutorial interativo, H2H detalhado, CPU varia tática por rodada e por liga
- 346 testes automatizados (motor + sincronização de elenco + componentes UI + Modo Carreira)

### ✅ Melhorias de código (auditoria 2026-07-24) — parte 2

- **Path aliases `@/`**: configurado em `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`. 40 imports atualizados de `../../../` para `@/`
- **TacticPresets + TacticEditor integrados**: `MatchScreen.tsx` (-71 linhas), `SetupScreen.tsx` (-53 linhas), `HalftimePanel.tsx` (-48 linhas). Total: -172 linhas de duplicação
- **Momentum visual**: barras coloridas no placar que pulsan com o momentum de cada time (lê de `engineStateRef.current.momentumHome`/`momentumAway`)
- **OnlineLobbyScreen CSS Module**: ~30 inline styles migrados para `OnlineLobbyScreen.module.css` — classes como `.roomCodeBadge`, `.teamCard`, `.connectBtn`, `.tacticsPanel`
- **CSS do momentum**: classes `.momentum-indicator`, `.momentum-track`, `.momentum-bar` em App.css com transições e animação de glow
- **`range()` doc corrigido**: documentação dizia `[min, max]` inclusivo, código sempre foi `[min, max)` exclusivo
- **`getGoalkeeper()` sem crash**: retorna `Player | null` em vez de estourar com `!` se não houver GK. Todos os 5 callers tratam null seguramente
- **`MatchResult.halftimeHomeScore` / `halftimeAwayScore`**: campos tipados no resultado em vez de parse frágil de string de narração. `achievements.ts` parou de depender do formato exato do texto em português
- **`App.tsx` refatorado**: 273 linhas de `if/else` substituídas por mapa declarativo `Record<Screen, ScreenRenderer>` em `src/components/AppScreens.tsx`. App.tsx de 602→344 linhas (-43%)
- **Tipos centralizados**: `Screen`, `MatchContext`, `TournamentMode` em `src/types/navigation.ts` — removidos de 7 hooks duplicados. `useOnlineMatch.ts` tinha versão defasada sem as telas de carreira
- **`src/engine/morale.ts`**: cálculo de moral extraído de 2 hooks duplicados (`useLeagueManager`, `useCareerManager`)
- **`src/engine/bracketHelpers.ts`**: `getStageMatches()` + `updateStageMatch()` substituem 6 blocos if/else duplicados nos hooks de bracket. `useBracketManager` -18 linhas, `useCareerManager` -30 linhas
- **Componentes compartilhados**: `TeamSlot`, `SquadList`, `TacticEditor`, `TacticPresets` em `src/components/shared/` — prontos para uso nos componentes existentes
- **`getAvgOvr()`**: removido de 4 componentes, centralizado em `utils/teamUtils.ts`
- **`useLiveRoster`**: reseta `lastError` antes de cada sync + bloco `catch` para exceções não-tratadas
- **`useAchievements`**: usa `setData(prev => ...)` funcional para evitar race condition em avaliações rápidas
- **`MatchStatsScreen`**: `useMemo` em `calculateRatings`, `manOfTheMatch`, `goalScorers`, `cardEvents`, `topPerformers`
- **`usePeerConnection`**: timeout de 15s com mensagem "Tempo limite de conexão" — evita estado "conectando" eterno
- **`TutorialOverlay`**: focus trap — foca botão "Pular" ao abrir, restaura foco ao fechar
- **Acessibilidade**: `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) em 10+ divs interativos (squad-row, select-slot)
- **`Pitch.tsx`**: `React.memo` no componente SVG mais caro do app (22+ jogadores + animação)
- **`LeagueScreen`**: stats da temporada em `useMemo` em vez de IIFE no render
- **`steering.ts`**: `Record<Position, number>` substitui `Record<string, number>`; `determineState` usa `MatchEvent['type']` em vez de `string`
- **`btnGlow`**: anima `opacity` (GPU-composited) em vez de `box-shadow` (repaint)
- **Tactical counter**: condição `high-line` reordenada antes de `high-press` — bônus 1.22 não é mais shadowado pelo 1.18
- **`simulateRegulationTime()`**: helper extraído do boilerplate "run two halves" duplicado em `simularPartidaRapida` e `simularKnockout`
- **`progressPlayer`**: preserva proporções de atributos ao envelhecer (escala existentes em vez de regenerar do zero)
