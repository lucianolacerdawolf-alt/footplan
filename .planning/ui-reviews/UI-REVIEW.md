# Auditoria visual — FootPlan

**Data:** 2026-07-29
**Base:** 21 capturas em `audit-20260729-183623/` (viewport mobile ~780px e desktop)
**Método:** leitura das capturas + confirmação de cada achado no código.

## Escopo e limites desta auditoria

O que foi coberto: Home (mobile e desktop), seleção de liga e de time, setup de
táticas, tela de liga, Matchday, partida ao vivo, painel de pausa.

**O que ficou de fora** — a captura não chegou nessas telas, então elas seguem
sem auditoria: Central da Carreira, Mercado de Transferências, Sala de Troféus,
Conquistas, lobby online, fim de temporada.

**Duas ressalvas sobre o material:**
- As capturas são anteriores às correções de fluxo (botão "Avançar Rodada" na
  Central, "Propor Troca" no Mercado, "Voltar" do Matchday). Nada aqui contradiz
  essas correções, mas as telas afetadas mudaram desde a foto.
- `C4-career-hub.png` está rotulado errado: é a tela de seleção de time da
  carreira, não a Central. A Central nunca foi capturada.

---

## Notas por pilar

| Pilar | Nota | Resumo |
|---|---|---|
| Hierarquia visual | 4/10 | Rótulos maiores que os dados; três acentos competindo sem semântica |
| Consistência | 3/10 | Formulário de táticas duplicado com conjuntos diferentes de campos; vermelho como cor decorativa |
| Acessibilidade / contraste | 3/10 | O placar da partida é ilegível; vários textos secundários abaixo de AA |
| Mobile / alvos de toque | 6/10 | Cards generosos, mas topbar abarrotada e botões "?" pequenos |
| Layout / espaçamento | 5/10 | ~500px de espaço morto no Matchday; painel de pausa sem scrim |
| Conteúdo e estados | 5/10 | "Destaques" mostra 3 goleiros; CTA fora de alcance na seleção de time |

---

# Crítico

### 1. O placar da partida é ilegível

**Onde:** `D6-pause-panel.png`, `D5-match-live.png`

A abreviação do time ("FCU", "BAY") é renderizada em vermelho escuro sobre fundo
escuro e praticamente desaparece. Os dígitos do placar são cinza-escuro sobre o
mesmo fundo. O único elemento legível do bloco é o relógio, em ciano.

É o elemento mais importante da tela de partida. Um usuário olhando de relance
não consegue dizer quem está ganhando.

**Correção.** Subir a abreviação e os dígitos para o token de texto de maior
contraste (`--text-h`) e reservar o vermelho para o realce de estado (cartão,
lesão). Conferir com o verificador de contraste: o alvo é 4.5:1 para os dígitos,
que são texto pequeno-médio.

---

### 2. O painel de pausa não tem overlay — o conteúdo de trás vaza

**Onde:** `D6-pause-panel.png`

O card "JOGO PAUSADO" flutua sobre o feed de comentários sem scrim. O feed
continua visível e legível ao redor e atrás das bordas, com frases cortadas
aparecendo colada no card ("sado.", "ço.", "defesa!", "n)."). Também aparecem os
rótulos "0%" e "100%" da barra de posse, sobrando por cima.

Não parece uma escolha de design; parece um bug de z-index/backdrop.

**Correção.** Adicionar backdrop escurecido com blur (o app já tem esse
tratamento na `penalty-overlay`, ver `MatchScreen.tsx` — reusar o mesmo padrão em
vez de criar outro).

---

# Alto

### 3. Formulário de táticas duplicado, com campos diferentes em cada pausa

**Onde:** `D6-pause-panel.png` — e confirmado no código.

O painel do **intervalo** ([HalftimePanel.tsx:105](../../src/components/MatchScreen/HalftimePanel.tsx:105)) usa o
`TacticEditor` compartilhado, que tem 7 campos — incluindo Escanteio e Falta.

A pausa **no meio do jogo** usa um formulário inline dentro de
[MatchScreen.tsx:834](../../src/components/MatchScreen.tsx:834), que tem só 5
campos. `grep -c "cornerTactic" src/components/MatchScreen.tsx` retorna **0**.

Resultado: o usuário configura bola parada no intervalo, mas os mesmos controles
não existem se ele pausar no meio do tempo. Mesma tela, dois conjuntos de
opções, sem nenhuma razão visível.

Esse é o tipo de divergência que a duplicação garante que vai acontecer de novo:
a bola parada foi adicionada ao `TacticEditor` e o formulário inline ficou para
trás.

**Correção.** Trocar o formulário inline de `MatchScreen.tsx` pelo `TacticEditor`.
Ele já aceita `disabled`, então o caso do adversário controlado pela CPU está
coberto. Isso elimina 10 blocos de `TacticLabel` duplicados.

---

### 4. Vermelho usado como cor decorativa, não de erro

**Onde:** `C4-career-hub.png` (borda do time selecionado), `E3-matchday.png`
(barras dos jogadores em destaque), `D6-pause-panel.png` (rótulos 0%/100%,
abreviações do placar)

O time selecionado na carreira recebe uma borda vermelha saturada — a dois
centímetros de um texto em ciano dizendo "Time selecionado! Pode começar."
Vermelho ao lado de uma mensagem de sucesso lê como alerta, não como seleção.

O mesmo vermelho reaparece como barra decorativa nos destaques e como cor dos
rótulos de percentual.

**Correção.** Seleção usa o acento da marca (ciano), que é o que o resto do app
já faz (a dificuldade selecionada na Home é ciano). Reservar vermelho para
cartão, lesão, saldo negativo e mensagens de erro.

---

### 5. Três acentos competindo, sem semântica definida

**Onde:** todas as capturas

- **Ciano** — marca, seleção na Home, relógio, CTA do painel de pausa
- **Vermelho** — seleção de time, decoração de destaques, rótulos de percentual
- **Âmbar/laranja** — o CTA "Iniciar Partida" do Matchday **e** os números de OVR

O CTA primário mais importante do Matchday é laranja, enquanto o CTA primário do
painel de pausa é ciano. E o mesmo âmbar do CTA é usado para dados numéricos
(OVR), então a cor não distingue "ação" de "informação".

**Correção.** Definir um papel por cor e documentar: ciano = ação primária e
seleção; âmbar = dado numérico de destaque (OVR, valores); vermelho = negativo.
Depois varrer os `*.module.css` procurando hex hardcoded — o `CareerHubScreen`
já tem `style={{ color: '#34d399' }}` inline, sinal de que o token não existe.

---

### 6. O rótulo é maior que o dado

**Onde:** `D6-pause-panel.png`, `E2-setup.png`

"Formação", "Mentalidade", "Intensidade", "Linha Defensiva", "Amplitude" são
renderizados grandes (~22px) e claros; o valor dentro do `select` ("4-3-3",
"Posse de Bola") é menor (~16px). A hierarquia está invertida: o que o usuário
precisa ler é o valor, não a categoria.

**Correção.** Rótulo em ~13px, uppercase, cor secundária; valor em ~16-18px com
peso maior. O app já usa esse padrão nos cards de estatística da Central
("JOGOS" pequeno sobre o número grande) — replicar.

---

# Médio

### 7. "Jogadores em destaque" mostra 3 goleiros em 6

**Onde:** `E3-matchday.png`

Os destaques do Arsenal são Tommy Setford (GK 96), Martin Ødegaard (MID 94) e
Illan Meslier (GK 94). Do Aston Villa: Leon Bailey (FWD 90), Marco Bizot (GK 89),
João Gomes (MID 88). Dois goleiros de três num lado, um no outro.

A causa está em [MatchdayScreen.tsx:42-48](../../src/components/MatchdayScreen.tsx:42):
ordena o elenco por `playerOvr` puro e corta os 3 primeiros. Como o OVR de
goleiro é calibrado em outra escala, eles dominam o topo.

Não é bug visual — é a informação errada num lugar de destaque. "Jogadores em
destaque" antes de um jogo deveria mostrar quem decide a partida.

**Correção.** Garantir diversidade de posição: no máximo 1 GK, e preencher o
resto com os melhores de linha. Vale um teste unitário, porque é fácil regredir.

**Observação separada.** Marco Bizot e João Gomes não são jogadores do Aston
Villa, e Illan Meslier não é do Arsenal. Isso é dado de elenco, não UI — mas se
a sincronização via API está atribuindo jogadores ao clube errado, é um problema
maior que qualquer coisa nesta lista. Vale investigar em separado.

---

### 8. ~500px de espaço morto no Matchday

**Onde:** `E3-matchday.png`

O conteúdo termina no comentário tático e a barra de ações fica presa no rodapé.
Entre os dois há um vazio de aproximadamente 500px de fundo puro.

**Correção.** Ou centrar o bloco de conteúdo verticalmente no espaço
disponível, ou usar a folga para o que a tela não mostra hoje: forma recente dos
times, retrospecto do confronto (o H2H já é carregado, ver `useH2H`), desfalques.

---

### 9. Os três cards de contexto usam a segunda linha para três coisas diferentes

**Onde:** `E3-matchday.png`

- "Arsenal Arena" / "35.000 lugares" → valor + detalhe do valor
- "Ventania" / "Condições do jogo" → valor + **nome da categoria**
- "4-3-3 vs 4-3-3" / "Posse de Bola" → valor + **outro valor**

Três cards visualmente idênticos, três contratos de informação diferentes. O do
meio é o mais estranho: a categoria aparece embaixo do valor, ao contrário do
padrão de rótulo-sobre-dado usado em outras telas.

**Correção.** Padronizar como rótulo pequeno em cima, valor em baixo, nos três.

---

### 10. Na seleção de time, o CTA fica fora de alcance

**Onde:** `C4-career-hub.png`

A lista tem 20 times em grid de 2 colunas — uma página de ~3000px no mobile. O
usuário rola até o fim, toca no time, e o botão de confirmar está no topo. Ele
tem que rolar a página inteira de volta.

Além disso o time escolhido aparece **duas vezes**: no card destacado do topo e
no grid, ambos com a borda vermelha. É a mesma informação ocupando dois lugares.

**Correção.** CTA fixo no rodapé (o Matchday já faz isso e funciona bem). Com
CTA fixo, o card duplicado do topo perde a função e pode sair.

---

### 11. Contraste baixo em textos secundários

**Onde:** `E3-matchday.png`, `D6-pause-panel.png`, `B4-league-screen.png`

Candidatos a reprovar em WCAG AA (4.5:1 para texto normal, 3:1 para texto
grande):
- "Rodada 1" — pill cinza-escuro sobre fundo escuro
- "35.000 lugares", "Condições do jogo", "Posse de Bola" — subtítulos dos cards
- "4-3-3 x 4-3-3" na topbar da partida
- "POSSE DE BOLA" acima da barra

**Correção.** Medir cada um e subir para o token secundário que passe AA. Isso
não é preciosismo: o app é jogado em celular, muitas vezes com brilho baixo.

---

### 12. A topbar da partida está abarrotada

**Onde:** `D6-pause-panel.png`

Na largura mobile, "FCU vs BAY" quebra em três linhas empilhadas e colide com
"4-3-3 x 4-3-3". Do lado, o botão de play e os quatro botões de velocidade
disputam a mesma faixa. O "← Voltar" é o único elemento com respiro.

**Correção.** No mobile, mostrar só as abreviações numa linha e mover as
formações para o bloco do placar (ou omitir — elas já aparecem no Matchday e no
painel de táticas). Considerar colapsar 1x/2x/3x/4x num único controle cíclico.

---

### 13. Alvos de toque pequenos nos botões de ajuda

**Onde:** `D6-pause-panel.png`, `E2-setup.png`

Os "?" ao lado de cada rótulo de tática são círculos pequenos, aparentemente bem
abaixo dos 44px recomendados. São 7 deles por tela.

**Correção.** Aumentar a área tocável com padding (mantendo o círculo visual
pequeno) ou tornar o rótulo inteiro tocável.

---

# Menor

### 14. Três tratamentos de ênfase ciano no mesmo card

**Onde:** `D6-pause-panel.png`

No painel de pausa: a aba "Táticas" tem contorno ciano com glow, o preset
"Equilibrado" tem contorno ciano com glow, e "Retomar Jogo" é preenchido em ciano
com glow. Três pesos de ênfase quase iguais para três coisas diferentes — aba
ativa, opção selecionada e ação primária.

**Correção.** Reservar o preenchimento sólido para a ação primária; usar
contorno sem glow para estado selecionado e sublinhado para aba ativa.

---

### 15. Emoji como iconografia, e dois ícones colidindo no comentário tático

**Onde:** `E3-matchday.png`

Os ícones dos cards são emoji (🏟️ 💨 📊 📋). Eles renderizam diferente em cada
plataforma e não herdam a cor do tema — escolha defensável num jogo, mas vale
saber que é uma escolha.

Mais visível: o card de comentário tático tem o 📋 como ícone do card **e** a
frase começa com 🔄, porque o prefixo está embutido na string
([tacticalCommentary.ts:34](../../src/engine/tacticalCommentary.ts:34) e `:59`).
Os dois emoji ficam lado a lado e o segundo parece caractere perdido no meio da
linha.

**Correção.** Tirar o prefixo emoji das strings de `tacticalCommentary.ts` e
deixar o ícone só no card — quem decide a apresentação é o componente, não o
gerador de texto. Conferir as demais strings do arquivo pelo mesmo padrão.

---

# Ordem sugerida

1. **Críticos 1 e 2** — o placar ilegível e o painel sem scrim são os dois que
   fazem o app parecer quebrado. Baratos e isolados.
2. **Alto 3** (formulário duplicado) — é correção de bug de paridade e ainda
   remove duplicação. Independente dos demais.
3. **Alto 4, 5 e 6** juntos — são a mesma reforma: definir os papéis de cor e a
   escala de rótulo/valor, depois aplicar. Fazer de uma vez evita duas passadas
   nos mesmos arquivos.
4. **Médio 7** — é conteúdo errado em destaque, e sai com teste.
5. **Médio 11 e 13** juntos — passada de acessibilidade.
6. O resto conforme houver espaço.

## Antes de continuar

Seis telas não foram auditadas por falta de captura, entre elas a Central da
Carreira e o Mercado — duas das mais usadas no modo principal do jogo. Vale uma
segunda rodada de capturas cobrindo essas antes de considerar a auditoria
completa.
