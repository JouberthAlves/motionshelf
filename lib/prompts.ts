// Prompts da aba "Prompt": ensinam o agente de quem visita a recriar cada componente no projeto
// dele, com as skills certas. Uma receita por componente (o que é, a animação passo a passo, o que
// perguntar) e um gerador que monta o texto final para o Claude Code ou para outros agentes.
//
// Comandos conferidos nas fontes oficiais em 2026-10-16:
// - GSAP: github.com/greensock/gsap-skills (MIT) — `npx skills add https://github.com/greensock/gsap-skills`
// - anatomy: github.com/wheresryan22/anatomy (MIT) — `npx skills add wheresryan22/anatomy -g -a claude-code`
// - HyperFrames: github.com/heygen-com/hyperframes (Apache-2.0) — plugin `hyperframes@hyperframes`

import type { Entry, Locale, Text } from "./catalog";

export type Agent = "claude" | "other";
export type Technique = "gsap" | "anatomy";

type Recipe = {
  technique: Technique;
  /** Como o componente é, parado. */
  look: Text;
  /** A animação, passo a passo, com tempos. */
  beats: Text[];
  /** O que perguntar à pessoa antes de escrever código. */
  adapt: Text[];
  /** Cuidados extras só deste componente. */
  extra?: Text[];
};

const t = (en: string, pt: string): Text => ({ en, pt });

export const SKILLS = {
  gsap: {
    name: "GSAP skills (GreenSock)",
    repo: "https://github.com/greensock/gsap-skills",
    claude: "npx skills add https://github.com/greensock/gsap-skills",
    other: "npx skills add https://github.com/greensock/gsap-skills --agent <your-agent>",
  },
  anatomy: {
    name: "anatomy",
    repo: "https://github.com/wheresryan22/anatomy",
    claude: "npx skills add wheresryan22/anatomy -g -a claude-code",
    other: "npx skills add wheresryan22/anatomy -g -a <your-agent>",
  },
  hyperframes: {
    name: "HyperFrames",
    repo: "https://github.com/heygen-com/hyperframes",
    claude: ["claude plugin marketplace add heygen-com/hyperframes", "claude plugin install hyperframes@hyperframes"],
    other: "npx skills add heygen-com/hyperframes",
  },
} as const;

const RECIPES: Record<string, Recipe> = {
  "title-reveal": {
    technique: "gsap",
    look: t(
      "A large bold headline on two or three lines, one key word with a solid colored marker behind it, and a short subtitle below.",
      "Um título grande em negrito, em duas ou três linhas, com uma palavra-chave sobre um marcador de cor sólida e um subtítulo curto embaixo.",
    ),
    beats: [
      t("Each word sits in its own overflow-hidden line wrapper and starts pushed down (yPercent 110) and blurred (8px).", "Cada palavra fica num invólucro com overflow escondido e começa empurrada para baixo (yPercent 110) e desfocada (8px)."),
      t("At 0.2 s the words rise to place one after another (stagger 0.08 s, 0.85 s each, ease expo.out), losing the blur.", "Aos 0,2 s as palavras sobem para o lugar uma depois da outra (stagger 0,08 s, 0,85 s cada, ease expo.out), perdendo o desfoque."),
      t("At 1.0 s the marker behind the key word grows from the left (scaleX 0 → 1, 0.65 s, expo.inOut).", "Aos 1,0 s o marcador atrás da palavra-chave cresce a partir da esquerda (scaleX 0 → 1, 0,65 s, expo.inOut)."),
      t("At 1.3 s the key word turns white so it reads on the marker.", "Aos 1,3 s a palavra-chave fica branca para ler sobre o marcador."),
      t("At 1.4 s the subtitle fades up from 10 px below, then everything holds for 2 s and the loop restarts after 1.6 s.", "Aos 1,4 s o subtítulo aparece subindo 10 px, tudo fica parado por 2 s e o loop recomeça depois de 1,6 s."),
    ],
    adapt: [
      t("the headline lines and which word gets the marker", "as linhas do título e qual palavra recebe o marcador"),
      t("the subtitle", "o subtítulo"),
      t("the marker color", "a cor do marcador"),
    ],
    extra: [t("The headline color is inherited from the page; only the key word is forced to white while it sits on the marker.", "A cor do título vem da página; só a palavra-chave fica branca enquanto está sobre o marcador.")],
  },
  "rotating-word": {
    technique: "gsap",
    look: t(
      "One sentence where a single word keeps changing, for example \"Build your next / landing page / in minutes.\" The changing word is in the accent color.",
      "Uma frase em que uma palavra não para de trocar, por exemplo \"Crie seu próximo / site / em minutos.\" A palavra que troca fica na cor de destaque.",
    ),
    beats: [
      t("The changing words are stacked in a vertical track inside a slot one line tall with overflow hidden; the first word is repeated at the end so the loop is seamless.", "As palavras ficam empilhadas numa trilha vertical, dentro de um espaço de uma linha com overflow escondido; a primeira palavra se repete no fim para o loop não pular."),
      t("Every 1.3 s the track moves up one word (yPercent step, 0.55 s, expo.inOut) with a short blur (3 px) only in the middle of the move.", "A cada 1,3 s a trilha sobe uma palavra (passo em yPercent, 0,55 s, expo.inOut), com um desfoque curto (3 px) só no meio da troca."),
      t("After the repeated first word, the track jumps back to the start without animation and the loop continues.", "Depois da primeira palavra repetida, a trilha volta ao início sem animação e o loop continua."),
    ],
    adapt: [
      t("the text before the word, the words that rotate and the text after", "o texto antes da palavra, as palavras que trocam e o texto depois"),
      t("the accent color of the word", "a cor de destaque da palavra"),
    ],
    extra: [
      t("Put the text after the word on its own line, so a short word never leaves a gap and the sentence never reflows when the word changes.", "Coloque o texto depois da palavra numa linha própria: assim uma palavra curta não deixa vão e a frase não muda de linha quando a palavra troca."),
      t("The slot is as wide as the longest word, measured once.", "O espaço tem a largura da palavra mais longa, medida uma vez."),
    ],
  },
  "before-after-text": {
    technique: "gsap",
    look: t(
      "A small heading and three rows. Each row shows an old way of doing something; it gets crossed out and the new way appears in its place, with a colored dot.",
      "Um título pequeno e três linhas. Cada linha mostra um jeito antigo de fazer algo; ele é riscado e o jeito novo aparece no lugar, com uma bolinha colorida.",
    ),
    beats: [
      t("The heading fades in (0.5 s) and the old texts slide in from the left with a slight blur, one after another (stagger 0.12 s).", "O título aparece (0,5 s) e os textos antigos entram da esquerda com um leve desfoque, um depois do outro (stagger 0,12 s)."),
      t("From 1.2 s, row by row every 0.9 s: a strike line grows across the old text (scaleX, 0.45 s), the old text leaves upward with blur, and the new text rises in (0.7 s, expo.out).", "A partir de 1,2 s, uma linha a cada 0,9 s: um traço cresce sobre o texto antigo (scaleX, 0,45 s), o antigo sai para cima com desfoque e o novo sobe no lugar (0,7 s, expo.out)."),
      t("Everything holds 1.8 s and the loop restarts.", "Tudo fica parado 1,8 s e o loop recomeça."),
    ],
    adapt: [
      t("the heading", "o título"),
      t("each row: the old way and the new way", "cada linha: o jeito antigo e o jeito novo"),
      t("the accent color of the new way", "a cor de destaque do jeito novo"),
    ],
    extra: [t("Old and new texts share the same spot in each row (stacked), so nothing jumps when they swap.", "O texto antigo e o novo ocupam o mesmo lugar na linha (sobrepostos), para nada pular na troca.")],
  },
  "chat-flow": {
    technique: "gsap",
    look: t(
      "A phone mockup. First a small landing block with a title, two rows of choice chips and a button; then a chat screen with a header, the visitor's message, typing dots and a reply.",
      "Um celular. Primeiro um bloco de página com título, duas linhas de opções e um botão; depois uma tela de chat com cabeçalho, a mensagem do visitante, os três pontinhos de digitando e a resposta.",
    ),
    beats: [
      t("A round cursor moves to a chip in the first row (0.6 s), presses it (scale down and back) and the chip fills with the dark color; then the same in the second row.", "Um cursor redondo vai até uma opção da primeira linha (0,6 s), aperta (diminui e volta) e a opção fica preenchida; depois o mesmo na segunda linha."),
      t("The cursor moves to the button, presses it, and fades out.", "O cursor vai até o botão, aperta e some."),
      t("At 2.85 s the chat slides in from the right. The visitor's message types out letter by letter (1.4 s), then the read ticks turn blue.", "Aos 2,85 s o chat entra pela direita. A mensagem do visitante é digitada letra a letra (1,4 s) e os vistos ficam azuis."),
      t("The header status changes to \"typing…\", three dots bounce, then the reply bubble pops in (back.out) and the status goes back to \"online\".", "O status do cabeçalho muda para \"digitando…\", três pontinhos pulam e a resposta aparece com um pulo (back.out); o status volta a \"online\"."),
    ],
    adapt: [
      t("the business name, the title and the two rows of choices", "o nome do negócio, o título e as duas linhas de opções"),
      t("which choices the cursor picks", "quais opções o cursor escolhe"),
      t("the button label, the visitor's message and the reply (the message should mention the picked choices)", "o texto do botão, a mensagem do visitante e a resposta (a mensagem deve citar as opções escolhidas)"),
      t("the button color", "a cor do botão"),
    ],
    extra: [t("Do not copy the look of a real messaging app (logo, exact colors); keep it a generic chat.", "Não copie a cara de um app de mensagens real (logo, cores exatas); mantenha um chat genérico.")],
  },
  "question-typer": {
    technique: "gsap",
    look: t(
      "A dark card with a colored bar on the left. A question types itself out, and its answer appears under it in a box with a small label.",
      "Um card escuro com uma barra colorida à esquerda. Uma pergunta é digitada sozinha e a resposta aparece embaixo, numa caixa com um rótulo pequeno.",
    ),
    beats: [
      t("The question types out at 0.045 s per letter, with a blinking caret (steps ease, its own loop outside the main timeline).", "A pergunta é digitada a 0,045 s por letra, com um cursor piscando (ease steps, num loop próprio fora da timeline principal)."),
      t("0.35 s later the answer box rises in with a blur that clears, and the answer writes itself faster (0.022 s per letter).", "0,35 s depois a caixa da resposta sobe com um desfoque que some, e a resposta se escreve mais rápido (0,022 s por letra)."),
      t("After 1.6 s the answer box fades up and out and the question erases quickly; then the next question starts. After the last one, the loop restarts.", "Depois de 1,6 s a caixa sai subindo e a pergunta se apaga rápido; aí começa a próxima. Depois da última, o loop recomeça."),
    ],
    adapt: [
      t("the questions and the answer to each one", "as perguntas e a resposta de cada uma"),
      t("the label above the answer", "o rótulo acima da resposta"),
      t("the accent color", "a cor de destaque"),
    ],
    extra: [t("With reduced motion, stop on the first question already answered.", "Com movimento reduzido, pare na primeira pergunta já respondida.")],
  },
  "appointment-reminder": {
    technique: "gsap",
    look: t(
      "A phone with a business chat: a reminder message with two buttons (Confirm and Reschedule) under it.",
      "Um celular com o chat de um negócio: uma mensagem de lembrete com dois botões embaixo (Confirmar e Remarcar).",
    ),
    beats: [
      t("At 0.4 s the reminder bubble pops in (back.out); at 0.8 s the two buttons appear under it.", "Aos 0,4 s o balão do lembrete aparece com um pulo (back.out); aos 0,8 s os dois botões aparecem embaixo."),
      t("At 1.7 s a round cursor appears and moves to the Confirm button (0.6 s), presses it, and the button tints.", "Aos 1,7 s um cursor redondo aparece e vai até o botão Confirmar (0,6 s), aperta e o botão muda de cor."),
      t("The buttons collapse (height to 0), the customer's \"Confirm\" bubble appears on the right, and at 3.6 s the business replies with the confirmation.", "Os botões encolhem (altura até 0), o balão \"Confirmar\" do cliente aparece à direita e aos 3,6 s o negócio responde com a confirmação."),
    ],
    adapt: [
      t("the business name and the customer's first name", "o nome do negócio e o primeiro nome do cliente"),
      t("the day and time of the appointment, and the confirmation text", "o dia e o horário do compromisso, e o texto de confirmação"),
      t("the header and button color", "a cor do cabeçalho e dos botões"),
    ],
    extra: [t("The bubbles that appear later use display:none until their turn, and the button area gets its height back at the start of each loop (clearProps).", "Os balões que aparecem depois ficam com display:none até a vez deles, e a área dos botões recupera a altura no começo de cada volta (clearProps).")],
  },
  "payment-notification": {
    technique: "gsap",
    look: t(
      "A phone lock screen with a large clock. A payment notification drops in from the top; then the bank app opens with a check mark and the amount counting up.",
      "A tela bloqueada de um celular, com um relógio grande. Uma notificação de pagamento desce do topo; depois o app do banco abre com um check e o valor subindo.",
    ),
    beats: [
      t("At 0.6 s the notification drops from above (y -110 → 0, 0.6 s, back.out(1.6)).", "Aos 0,6 s a notificação desce do topo (y -110 → 0, 0,6 s, back.out(1.6))."),
      t("At 2.0 s it gets a quick tap (scale 0.97 and back), and at 2.3 s the app screen fades in over the lock screen.", "Aos 2,0 s ela recebe um toque rápido (scale 0,97 e volta) e aos 2,3 s a tela do app aparece por cima."),
      t("A round check badge pops in (back.out(2)) and its check mark draws itself (stroke-dashoffset to 0).", "Um selo redondo aparece com um pulo (back.out(2)) e o check se desenha (stroke-dashoffset até 0)."),
      t("At 2.8 s the amount counts from 0 to the total in 1.3 s (power2.out), formatted with Intl.NumberFormat in the chosen currency; at 3.6 s the reference line fades in.", "Aos 2,8 s o valor conta de 0 até o total em 1,3 s (power2.out), formatado com Intl.NumberFormat na moeda escolhida; aos 3,6 s a linha de referência aparece."),
    ],
    adapt: [
      t("the amount, currency and number format (e.g. BRL with pt-BR)", "o valor, a moeda e o formato do número (ex.: BRL com pt-BR)"),
      t("who sent it, what it was for, and the app name", "quem enviou, a que se refere e o nome do app"),
      t("the accent color of the app icon and the check", "a cor do ícone do app e do check"),
    ],
    extra: [t("Use a generic bank icon; do not copy the logo of a real bank or payment method.", "Use um ícone de banco genérico; não copie o logo de um banco ou meio de pagamento real.")],
  },
  "search-ad": {
    technique: "gsap",
    look: t(
      "A search page: a rounded search box, a sponsored result with a colored outline, an organic result below it, and a button.",
      "Uma página de busca: uma caixa de pesquisa arredondada, um resultado patrocinado com contorno colorido, um resultado orgânico embaixo e um botão.",
    ),
    beats: [
      t("The caret blinks, then at 0.4 s the query types itself out in 1.3 s.", "O cursor pisca e aos 0,4 s a busca é digitada em 1,3 s."),
      t("At 2.0 s the results rise in one after another; the organic result stays at 55% opacity so the sponsored one stands out.", "Aos 2,0 s os resultados sobem um depois do outro; o orgânico fica com 55% de opacidade para o patrocinado se destacar."),
      t("At 2.7 s the sponsored result pulses once (scale 1.03 and back); at 3.2 s the button appears.", "Aos 2,7 s o patrocinado pulsa uma vez (scale 1,03 e volta); aos 3,2 s o botão aparece."),
    ],
    adapt: [
      t("the search query", "o texto da busca"),
      t("the sponsored result (domain, title, description) and the organic one", "o resultado patrocinado (domínio, título, descrição) e o orgânico"),
      t("the button label and the accent color", "o texto do botão e a cor de destaque"),
    ],
    extra: [t("Keep it a generic search page; do not reproduce the logo or exact layout of a real search engine.", "Mantenha uma página de busca genérica; não reproduza o logo nem o layout exato de um buscador real.")],
  },
  "map-pin-drop": {
    technique: "gsap",
    look: t(
      "A simple illustrated map (light blocks, white streets, a strip of water). A pin drops on it and an address card slides up from the bottom.",
      "Um mapa ilustrado simples (quarteirões claros, ruas brancas, uma faixa de água). Um pino cai nele e um card de endereço sobe de baixo.",
    ),
    beats: [
      t("At 0.4 s the pin falls from 160 px above and bounces (0.55 s, bounce.out); its shadow grows under it at the same time.", "Aos 0,4 s o pino cai de 160 px acima e quica (0,55 s, bounce.out); a sombra cresce embaixo dele ao mesmo tempo."),
      t("At 0.95 s a ring pulses out from the pin twice (scale 0.3 → 1.8 while fading).", "Aos 0,95 s um anel pulsa a partir do pino duas vezes (scale 0,3 → 1,8 enquanto some)."),
      t("At 1.4 s the address card slides up (back.out(1.4)); at 2.6 s its button gets a quick tap.", "Aos 1,4 s o card de endereço sobe (back.out(1,4)); aos 2,6 s o botão dele recebe um toque rápido."),
    ],
    adapt: [
      t("the place name, the address and the button label", "o nome do lugar, o endereço e o texto do botão"),
      t("the accent color of the pin, ring and button", "a cor do pino, do anel e do botão"),
    ],
    extra: [
      t("The pin's tip lands exactly on the center of its shadow: position the wrapper, animate the pin inside it.", "A ponta do pino pousa exatamente no centro da sombra: posicione o invólucro e anime o pino dentro dele."),
      t("The map is a drawing, not a real map; no map API is needed.", "O mapa é um desenho, não um mapa real; não precisa de API de mapas."),
    ],
  },
  "slot-booking": {
    technique: "gsap",
    look: t(
      "A day with a grid of time slots; some are taken (dark). A pointer picks a free slot, it fills with color, and a confirmation bar appears.",
      "Um dia com uma grade de horários; alguns já estão ocupados (escuros). Um ponteiro escolhe um horário livre, ele se enche de cor e aparece uma barra de confirmação.",
    ),
    beats: [
      t("At 0.3 s a round pointer moves to the picked slot (0.8 s, power2.inOut) and presses it.", "Aos 0,3 s um ponteiro redondo vai até o horário escolhido (0,8 s, power2.inOut) e aperta."),
      t("At 1.2 s the slot fills with the accent color from the bottom (scaleY 0 → 1) and the pointer fades out.", "Aos 1,2 s o horário se enche com a cor de destaque de baixo para cima (scaleY 0 → 1) e o ponteiro some."),
      t("At 1.6 s the confirmation bar pops up with the day, the time and a short label.", "Aos 1,6 s a barra de confirmação aparece com o dia, o horário e um rótulo curto."),
    ],
    adapt: [
      t("the day, the list of times, which ones are taken and which one is picked", "o dia, a lista de horários, quais estão ocupados e qual é escolhido"),
      t("the confirmation label and the accent color", "o rótulo de confirmação e a cor de destaque"),
    ],
  },
  "add-to-cart": {
    technique: "gsap",
    look: t(
      "A small store mockup: a top bar with the store name, the cart total and a round cart icon with a count badge; below it a product card with a square product tile, name, one detail line, price and a full-width \"Add to cart\" button. A round pointer rests near the bottom left.",
      "Uma loja em miniatura: uma barra no topo com o nome da loja, o total do carrinho e um ícone redondo de carrinho com contador; embaixo, um card de produto com uma imagem quadrada, nome, uma linha de detalhe, preço e um botão \"Adicionar ao carrinho\" na largura toda. Um ponteiro redondo descansa perto do canto de baixo à esquerda.",
    ),
    beats: [
      t("At 0.4 s the pointer travels to the measured center of the button (0.8 s, power2.inOut) and presses it at 1.25 s (pointer scale 0.7 and button scale 0.96, yoyo).", "Aos 0,4 s o ponteiro vai até o centro medido do botão (0,8 s, power2.inOut) e aperta aos 1,25 s (ponteiro em scale 0,7 e botão em 0,96, yoyo)."),
      t("At 1.4 s the button text slides up and out and \"Added\" with a check slides in (back.out(2)); the pointer fades.", "Aos 1,4 s o texto do botão sobe e sai, e \"Adicionado\" com um check entra (back.out(2)); o ponteiro some."),
      t("At 1.45 s a small copy of the product tile flies to the cart in 0.75 s: x with power1.in, y with back.in(2.2) so it arcs up before dropping in, and it shrinks to 35%. Start and end are measured from the tile and the cart icon.", "Aos 1,45 s uma cópia pequena da imagem do produto voa até o carrinho em 0,75 s: x com power1.in, y com back.in(2.2) para subir num arco antes de cair, e encolhe para 35%. Início e fim são medidos da imagem e do ícone do carrinho."),
      t("At 2.2 s the cart wobbles (rotation -8°, yoyo), the badge number goes up by one and pops from scale 1.6 to 1 (back.out(3)), and the total counts up by the price in 0.6 s, formatted with Intl.NumberFormat.", "Aos 2,2 s o carrinho balança (rotation -8°, yoyo), o número do contador sobe um e pula de scale 1,6 para 1 (back.out(3)), e o total sobe o valor do produto em 0,6 s, formatado com Intl.NumberFormat."),
    ],
    adapt: [
      t("the store name, the product (name, detail, price, photo) and the currency", "o nome da loja, o produto (nome, detalhe, preço, foto) e a moeda"),
      t("how many items and what total the cart has before the click", "quantos itens e qual total o carrinho tem antes do clique"),
      t("the button texts and the accent color", "os textos do botão e a cor de destaque"),
    ],
    extra: [t("The flying copy is a separate absolutely positioned element; never move the real product tile.", "A cópia que voa é um elemento separado com posição absoluta; nunca mova a imagem real do produto.")],
  },
  "plan-toggle": {
    technique: "gsap",
    look: t(
      "A pricing block: a pill switch with \"Monthly\" and \"Yearly\" (a colored thumb behind the active side) and a small discount badge; below it three plan cards side by side, the middle one highlighted with a colored border and a \"Popular\" tag. Each card has the name, a big price with \"/mo\", a billing line and three features with check marks.",
      "Um bloco de preços: uma chave em pílula com \"Mensal\" e \"Anual\" (um fundo colorido atrás do lado ativo) e um selo pequeno de desconto; embaixo, três cards de plano lado a lado, o do meio em destaque com borda colorida e etiqueta \"Popular\". Cada card tem o nome, um preço grande com \"/mês\", uma linha de cobrança e três itens com check.",
    ),
    beats: [
      t("Each price digit is a vertical column of 0–9 plus an empty slot (for prices with fewer digits) inside an overflow-hidden box one line tall; the column moves with yPercent to show a digit.", "Cada dígito do preço é uma coluna vertical de 0 a 9 mais uma posição vazia (para preços com menos dígitos) dentro de uma caixa da altura de uma linha com overflow escondido; a coluna anda com yPercent para mostrar o dígito."),
      t("At 0.9 s the thumb gets a quick press (scale 0.94, yoyo); at 1.0 s it slides to Yearly (xPercent 100, 0.45 s, power3.inOut) and the label colors swap.", "Aos 0,9 s o fundo da chave leva um toque (scale 0,94, yoyo); aos 1,0 s ele desliza para Anual (xPercent 100, 0,45 s, power3.inOut) e as cores dos textos trocam."),
      t("At 1.1 s every digit column rolls to the yearly price (0.7 s, power3.inOut, stagger 0.04 s), the billing line cross-fades, and at 1.35 s the discount badge pops in (scale 0.6 → 1, back.out(2.4)).", "Aos 1,1 s todas as colunas rolam até o preço anual (0,7 s, power3.inOut, stagger 0,04 s), a linha de cobrança troca com fade, e aos 1,35 s o selo de desconto aparece (scale 0,6 → 1, back.out(2.4))."),
      t("At 4.2 s the same moves run back to Monthly, so the loop starts and ends on the same frame; pause 1.2 s.", "Aos 4,2 s os mesmos movimentos voltam para Mensal, então o loop começa e termina no mesmo quadro; pausa de 1,2 s."),
    ],
    adapt: [
      t("the plans: names, monthly and yearly price per month, features, and which one is highlighted", "os planos: nomes, preço por mês no mensal e no anual, itens e qual fica em destaque"),
      t("the currency symbol, the period text and the discount badge", "o símbolo da moeda, o texto do período e o selo de desconto"),
      t("the accent color", "a cor de destaque"),
    ],
    extra: [t("Prices are whole numbers so the odometer only rolls digits; give the price an aria-label, since the columns are hidden from screen readers.", "Os preços são inteiros, para o hodômetro só rolar dígitos; dê ao preço um aria-label, porque as colunas ficam escondidas dos leitores de tela.")],
  },
  "offer-countdown": {
    technique: "gsap",
    look: t(
      "A dark card: a small label with a pulsing colored dot, the line \"Ends in\", a flip clock with hours, minutes and seconds (two dark tiles per group, colons between groups, small labels below), and a stock line with a thin progress bar.",
      "Um card escuro: uma etiqueta pequena com um ponto colorido pulsando, a linha \"Termina em\", um relógio de placas com horas, minutos e segundos (duas placas escuras por grupo, dois-pontos entre os grupos, textos pequenos embaixo) e uma linha de estoque com uma barra fina.",
    ),
    beats: [
      t("The time is real: compute the deadline once in the browser (never during server render) and check it every 250 ms; when a digit changes, flip only that tile.", "O tempo é real: calcule o prazo uma vez no navegador (nunca no render do servidor) e confira a cada 250 ms; quando um dígito muda, vire só aquela placa."),
      t("Each tile has four halves: static top (new digit), static bottom (old digit), a top flap (old digit) that falls to rotationX -90 in 0.22 s (power2.in), and a bottom flap (new digit) that comes from rotationX 90 to 0 in 0.26 s (power2.out); then all halves show the new digit. Use perspective on the tile and backface-visibility hidden.", "Cada placa tem quatro metades: a de cima parada (dígito novo), a de baixo parada (dígito velho), uma aba de cima (dígito velho) que cai até rotationX -90 em 0,22 s (power2.in) e uma aba de baixo (dígito novo) que vem de rotationX 90 até 0 em 0,26 s (power2.out); no fim, todas mostram o dígito novo. Use perspective na placa e backface-visibility hidden."),
      t("On mount the tiles rise in (y 12 → 0, stagger 0.05 s) and the stock bar fills to stock ÷ total (0.9 s, power3.out). Every 2.6 s a light streak crosses the bar and the dot pulses.", "Ao montar, as placas sobem (y 12 → 0, stagger 0,05 s) e a barra de estoque enche até estoque ÷ total (0,9 s, power3.out). A cada 2,6 s um brilho passa pela barra e o ponto pulsa."),
      t("At zero the timer stops, the \"Ends in\" line is replaced by \"This offer has ended\" and the stock line dims.", "No zero o relógio para, a linha \"Termina em\" vira \"Esta oferta terminou\" e a linha de estoque fica apagada."),
    ],
    adapt: [
      t("the real end date and time of the offer (and the time zone)", "a data e a hora reais do fim da oferta (e o fuso)"),
      t("the real stock left and the starting stock, or whether to hide the stock line", "o estoque que realmente resta e o estoque inicial, ou se a linha de estoque some"),
      t("the texts and the accent color", "os textos e a cor de destaque"),
    ],
    extra: [
      t("Never fake urgency: no timer that restarts on reload and no stock that drops on its own. If the offer has no real deadline, do not use this component.", "Nunca invente urgência: nada de relógio que recomeça ao recarregar nem de estoque que cai sozinho. Se a oferta não tem prazo real, não use este componente."),
      t("This one is not a looping timeline: the clock runs on real time and stops at zero; clear the interval on unmount.", "Este não é uma timeline em loop: o relógio anda no tempo real e para no zero; limpe o intervalo ao desmontar."),
    ],
  },
  "review-card": {
    technique: "gsap",
    look: t(
      "A white review card: a small heading, a big average rating next to five stars and the review count, a divider, then one review with a round initial avatar, the name, when it was written and the text.",
      "Um card branco de avaliações: um título pequeno, a nota média grande ao lado de cinco estrelas e do número de avaliações, uma linha divisória e uma avaliação com avatar redondo de inicial, o nome, quando foi escrita e o texto.",
    ),
    beats: [
      t("At 0.2 s the card rises in (y 14 → 0, 0.5 s, power3.out).", "Aos 0,2 s o card sobe (y 14 → 0, 0,5 s, power3.out)."),
      t("At 0.5 s the stars pop one by one (scale 0 → 1, back.out(2.6), stagger 0.09 s) and their color fills from the left; the last star fills only by the decimal (4.9 → 90%). At the same time the rating counts from 0 to 4.9 and the review count from 0 to 312 in 1.2 s, formatted with Intl.NumberFormat.", "Aos 0,5 s as estrelas pulam uma a uma (scale 0 → 1, back.out(2.6), stagger 0,09 s) e a cor enche a partir da esquerda; a última enche só a parte decimal (4,9 → 90%). Ao mesmo tempo a nota conta de 0 a 4,9 e o número de avaliações de 0 a 312 em 1,2 s, formatados com Intl.NumberFormat."),
      t("From 1.5 s each review takes 3.4 s: its words come in one after another (autoAlpha, y 8 → 0, blur 4px → 0, stagger 0.035 s), then it fades up and out 0.35 s before the next. The last review stays.", "A partir de 1,5 s cada avaliação ocupa 3,4 s: as palavras entram uma depois da outra (autoAlpha, y 8 → 0, blur 4px → 0, stagger 0,035 s) e ela sobe e some 0,35 s antes da próxima. A última fica."),
    ],
    adapt: [
      t("the real rating, the real review count and real reviews (name, text, when)", "a nota real, o número real de avaliações e avaliações reais (nome, texto, quando)"),
      t("the heading and the language of the numbers", "o título e o idioma dos números"),
      t("the star color", "a cor das estrelas"),
    ],
    extra: [
      t("Stack all the reviews in the same grid cell so the card keeps the height of the longest one and nothing jumps.", "Empilhe todas as avaliações na mesma célula da grade, para o card ficar com a altura da maior e nada pular."),
      t("Use only real reviews, with permission. Do not copy the logo of a review platform.", "Use só avaliações reais, com permissão. Não copie o logo de uma plataforma de avaliações."),
    ],
  },
  "order-tracker": {
    technique: "gsap",
    look: t(
      "A white card: on top a small light map with blocks, a gray road from a store dot to a home pin and a round courier marker; below it the order number, \"Arrives in 12 min\" and four stages in a vertical list (round markers joined by a line, stage name and time).",
      "Um card branco: no topo um mapinha claro com quarteirões, uma rua cinza de um ponto da loja até um pino de casa e um marcador redondo do entregador; embaixo, o número do pedido, \"Chega em 12 min\" e quatro etapas numa lista vertical (marcadores redondos ligados por uma linha, nome da etapa e horário).",
    ),
    beats: [
      t("Stages check off at 0.3 s, 1.3 s, 2.3 s and 5.9 s: the marker fills with color (scale 0 → 1, back.out(2.4)), the check draws itself (stroke-dashoffset to 0) and the label goes from 55% to full opacity. Between them the vertical line grows a third at a time (scaleY, 0.5 s).", "As etapas ganham check aos 0,3 s, 1,3 s, 2,3 s e 5,9 s: o marcador enche de cor (scale 0 → 1, back.out(2.4)), o check se desenha (stroke-dashoffset até 0) e o texto vai de 55% para opacidade total. Entre elas a linha vertical cresce um terço por vez (scaleY, 0,5 s)."),
      t("From 2.5 s to 5.5 s the courier follows the road with MotionPathPlugin (align to the path, power1.inOut), the colored route draws behind it (stroke-dashoffset) and the minutes count down from 12 to 0.", "De 2,5 s a 5,5 s o entregador segue a rua com o MotionPathPlugin (alinhado ao caminho, power1.inOut), a rota colorida se desenha atrás dele (stroke-dashoffset) e os minutos contam de 12 até 0."),
      t("At 5.9 s \"Arrives in\" is replaced by \"Delivered\" (back.out(1.8)) and eight small confetti pieces burst from it to fixed offsets, then fall a little and fade by 7.3 s.", "Aos 5,9 s \"Chega em\" vira \"Entregue\" (back.out(1.8)) e oito confetes pequenos saem dele para posições fixas, depois caem um pouco e somem até 7,3 s."),
    ],
    adapt: [
      t("the four stages and their times (it can also show a service process, not only a delivery)", "as quatro etapas e os horários (também serve para mostrar um processo de atendimento, não só entrega)"),
      t("the order label, the minutes and the texts", "o texto do pedido, os minutos e as frases"),
      t("the accent color", "a cor de destaque"),
    ],
    extra: [t("Register MotionPathPlugin with gsap.registerPlugin. Confetti offsets are a fixed list, not random, so every loop looks the same.", "Registre o MotionPathPlugin com gsap.registerPlugin. As posições dos confetes são uma lista fixa, não aleatória, para toda volta ficar igual.")],
  },
  "sales-funnel": {
    technique: "anatomy",
    look: t(
      "An isometric machine that works as a sales funnel: a hopper on top, three sloped trays one below the other, a small box under each tray, and a lit bin with a counter at the end.",
      "Uma máquina isométrica que funciona como funil de vendas: um funil em cima, três bandejas inclinadas uma abaixo da outra, uma caixinha embaixo de cada bandeja e um recipiente iluminado com contador no fim.",
    ),
    beats: [
      t("Balls (people) drop from the hopper onto the first tray, a few per second.", "Bolinhas (pessoas) caem do funil na primeira bandeja, algumas por segundo."),
      t("On each tray a ball either rolls on to the next tray or falls through a notch into the box below. Chances to move on: 30% (clicked), 35% (called), 40% (booked).", "Em cada bandeja a bolinha ou rola para a próxima ou cai por um recorte na caixinha de baixo. Chance de seguir: 30% (clicou), 35% (ligou), 40% (agendou)."),
      t("Balls that pass all three trays light up and land in the bin; its counter goes up. A readout under the figure says \"N came in → a → b → c booked\".", "As que passam pelas três bandejas acendem e caem no recipiente, e o contador sobe. Uma linha embaixo da figura diz \"N entraram → a → b → c agendados\"."),
      t("Moving the pointer left or right (or the arrow keys) changes how many balls come in per second, like changing the ad budget. With no input, the rate drifts slowly on its own.", "Mover o mouse para a esquerda ou direita (ou as setas) muda quantas bolinhas entram por segundo, como mudar a verba do anúncio. Sem interação, a taxa varia devagar sozinha."),
    ],
    adapt: [
      t("the names of the three stages and the chance of moving on at each one", "o nome das três etapas e a chance de seguir em cada uma"),
      t("the theme (dark or light) and the accent color of the lit balls and bin", "o tema (escuro ou claro) e a cor das bolinhas acesas e do recipiente"),
    ],
    extra: [
      t("Follow the anatomy skill's workflow: build the static figure with its kit (solids, trays, boxes, screws, rulers), then animate only the balls and the counter on top of it.", "Siga o fluxo da skill anatomy: monte a figura parada com o kit dela (sólidos, bandejas, caixas, parafusos, réguas) e anime só as bolinhas e o contador por cima."),
      t("Use a seeded random so the same film plays every time; stop the loop when the figure is offscreen; with reduced motion show one still frame with the totals for 1,000 people.", "Use um aleatório com semente, para o mesmo filme rodar toda vez; pare o loop quando a figura sair da tela; com movimento reduzido mostre um quadro parado com o total de 1.000 pessoas."),
      t("In React, inject the SVG once with a constant object (not a new { __html } on every render), or the balls get drawn into a detached copy.", "Em React, injete o SVG uma vez com um objeto constante (não um { __html } novo a cada render), senão as bolinhas são desenhadas numa cópia solta."),
    ],
  },
  "roi-balance": {
    technique: "anatomy",
    look: t(
      "An isometric bench balance: a base plate on feet, a column with a pivot yoke, an equal-arm beam, two pans hanging on three rods each, stacked weights on the pans, a pointer swinging over a small fan-shaped scale on the column, and a counter box that shows the return.",
      "Uma balança de bancada em isométrico: base com pés, coluna com o garfo do gume, braço de braços iguais, dois pratos pendurados por três hastes cada, pesos empilhados nos pratos, um ponteiro que balança sobre uma escala em leque na coluna e um contador que mostra o retorno.",
    ),
    beats: [
      t("Left pan: the monthly ad budget, one weight per 2,000. Right pan: the revenue it brought in, in lit weights.", "Prato da esquerda: a verba mensal do anúncio, um peso a cada 2.000. Prato da direita: o faturamento que ela trouxe, em pesos acesos."),
      t("The model (example numbers): each click costs more as the budget grows, CPC = 1 × (1 + budget/3,000)^0.6; 3% of clicks buy at 150 each; revenue = clicks × 3% × 150; ROAS = revenue / budget (about 4.1× at 500, 2.7× at 4,000, 1.3× at 20,000).", "O modelo (números de exemplo): cada clique fica mais caro conforme a verba cresce, CPC = 1 × (1 + verba/3.000)^0,6; 3% dos cliques compram, a 150 cada; faturamento = cliques × 3% × 150; ROAS = faturamento / verba (cerca de 4,1× com 500, 2,7× com 4.000, 1,3× com 20.000)."),
      t("The beam tilts toward the heavier pan by 30° × (ROAS − 1)/(ROAS + 1): level means break-even. It moves on a damped spring, so it overshoots a little and settles. The pans stay level and follow the beam ends.", "O braço pende para o prato mais pesado em 30° × (ROAS − 1)/(ROAS + 1): nivelado é o empate. Ele se move numa mola amortecida, passa um pouco do ponto e assenta. Os pratos ficam nivelados e acompanham as pontas do braço."),
      t("The pointer hangs from the pivot and reads the return on the scale, with a stronger mark at 1×. The counter and a readout under the figure say \"Budget → revenue · ROAS\".", "O ponteiro pende do gume e marca o retorno na escala, com uma marca mais forte em 1×. O contador e uma linha embaixo da figura dizem \"Verba → faturamento · ROAS\"."),
      t("Moving the pointer left or right (or the arrow keys) sets the budget on a log scale from 500 to 20,000; with no input it drifts slowly on its own.", "Mover o mouse para a esquerda ou direita (ou as setas) define a verba em escala logarítmica de 500 a 20.000; sem interação, ela varia devagar sozinha."),
    ],
    adapt: [
      t("the conversion rate, the average order value and the currency", "a taxa de conversão, o valor médio da venda e a moeda"),
      t("the budget range", "a faixa de verba"),
      t("the theme (dark or light) and the accent color of the revenue weights and the pointer", "o tema (escuro ou claro) e a cor dos pesos do faturamento e do ponteiro"),
    ],
    extra: [
      t("Follow the anatomy skill's workflow: draw every static part with its kit, keep the model in one place, and let the readout come from the same numbers that move the beam.", "Siga o fluxo da skill anatomy: desenhe todas as peças paradas com o kit dela, deixe o modelo num lugar só e faça a leitura sair dos mesmos números que movem o braço."),
      t("A rotation can't be a screen transform: redraw the beam each frame as a box rotated about the pivot (visible faces by depth, outline by the convex hull), and move the pans with translateAlong.", "Rotação não se faz com transformação de tela: redesenhe o braço a cada quadro como uma caixa girada no gume (faces visíveis pela profundidade, contorno pelo fecho convexo) e mova os pratos com translateAlong."),
      t("Only one part is lit: the revenue weights (and the pointer). Stop the loop when offscreen; with reduced motion, jump straight to the resting tilt.", "Só uma parte é acesa: os pesos do faturamento (e o ponteiro). Pare o loop fora da tela; com movimento reduzido, vá direto à inclinação de repouso."),
    ],
  },
  "page-speed-gauge": {
    technique: "anatomy",
    look: t(
      "An isometric bench rig: a stack of plates on a load cell (the page weight), wired to a round bench stopwatch with a 0–10 s dial; a conveyor belt carries small visitor figures toward a door frame (the website); a pneumatic pusher behind the belt and a tray in front of it.",
      "Uma bancada em isométrico: uma pilha de chapas sobre uma célula de carga (o peso da página), ligada por fio a um cronômetro redondo com mostrador de 0 a 10 s; uma esteira leva bonequinhos de visitante até uma porta (o site); um empurrador pneumático atrás da esteira e uma bandeja na frente dela.",
    ),
    beats: [
      t("One plate per MB on the load cell. Load time = 0.6 s + MB ÷ connection speed (1 MB/s by default); the stopwatch needle (the lit part) shows it.", "Uma chapa por MB na célula de carga. Tempo de carga = 0,6 s + MB ÷ velocidade da conexão (1 MB/s por padrão); o ponteiro do cronômetro (a parte acesa) mostra esse tempo."),
      t("Visitors ride the belt toward the door, one every 0.55 s. Each one decides at the start whether it will leave, with the bounce chance for the current load time.", "Os visitantes andam na esteira até a porta, um a cada 0,55 s. Cada um decide no início se vai desistir, com a chance de abandono do tempo de carga atual."),
      t("Bounce follows Google's published curve (Think with Google, 2017), starting from 20% at 1 s: 1→3 s +32%, 1→5 s +90%, 1→6 s +106%, 1→10 s +123%, interpolated in between.", "O abandono segue a curva publicada pelo Google (Think with Google, 2017), partindo de 20% em 1 s: 1→3 s +32%, 1→5 s +90%, 1→6 s +106%, 1→10 s +123%, interpolando entre os pontos."),
      t("At the pusher, a visitor who leaves stops, the ram plate shoots across the belt, the visitor slides off the front edge, drops into the tray and fades. The others go through the door and fade. A readout says \"MB · loads in s · % leave\".", "No empurrador, quem desiste para, a placa avança sobre a esteira, o visitante escorrega pela borda da frente, cai na bandeja e some. Os outros passam pela porta e somem. Uma linha diz \"MB · carrega em s · % saem\"."),
      t("Moving the pointer left or right (or the arrow keys) sets the page weight from 0.5 to 8 MB; with no input it drifts slowly on its own.", "Mover o mouse para a esquerda ou direita (ou as setas) define o peso da página de 0,5 a 8 MB; sem interação, ele varia devagar sozinho."),
    ],
    adapt: [
      t("the bounce rate at 1 s and the connection speed", "a taxa de abandono em 1 s e a velocidade da conexão"),
      t("the page weight range", "a faixa de peso da página"),
      t("the theme (dark or light) and the accent color of the needle", "o tema (escuro ou claro) e a cor do ponteiro"),
    ],
    extra: [
      t("Follow the anatomy skill's workflow: draw every static part with its kit, draw one visitor once and clone it, and move clones, the ram and the plates with translateAlong; sort the visitors by depth every frame.", "Siga o fluxo da skill anatomy: desenhe todas as peças paradas com o kit dela, desenhe um visitante uma vez e clone, e mova os clones, a placa e as chapas com translateAlong; ordene os visitantes pela profundidade a cada quadro."),
      t("Paint order: back door post before the visitors, front belt rail, front post and lintel after them. Cite the source of the bounce curve in the caption.", "Ordem de pintura: o batente de trás antes dos visitantes; a lateral da frente da esteira, o batente da frente e a verga depois. Cite a fonte da curva de abandono na legenda."),
      t("Use a seeded random; stop the loop when offscreen; with reduced motion show one still frame with a few visitors on the belt and one in the tray.", "Use um aleatório com semente; pare o loop fora da tela; com movimento reduzido mostre um quadro parado com alguns visitantes na esteira e um na bandeja."),
    ],
  },
};

export const techniqueOf = (slug: string): Technique => RECIPES[slug]?.technique ?? "gsap";
export const hasPrompt = (slug: string) => slug in RECIPES;

// Cuidados que valem para todo componente em GSAP.
const GSAP_RULES: Text[] = [
  t("Use one GSAP timeline that loops forever with a short pause between runs (repeat: -1). If the step by step gives the pause, use that value; otherwise repeatDelay about 1.4 s.", "Use uma timeline do GSAP em loop, com uma pausa curta entre as voltas (repeat: -1). Se o passo a passo der a pausa, use esse valor; senão, repeatDelay perto de 1,4 s."),
  t("Set every starting state with set() at the start of the timeline, never with from(): on the second loop from() starts from the wrong place.", "Defina todo estado inicial com set() no começo da timeline, nunca com from(): na segunda volta o from() começa do lugar errado."),
  t(
    "Elements that appear later and would push the layout (new chat bubbles, new rows) stay display:none until their turn; elements that already have their place in the layout (a subtitle, a button) start hidden with autoAlpha 0, so nothing jumps.",
    "Elementos que aparecem depois e empurrariam o layout (balões novos de chat, linhas novas) ficam com display:none até a vez deles; elementos que já têm o lugar reservado (um subtítulo, um botão) começam escondidos com autoAlpha 0, para nada pular.",
  ),
  t("If there is a cursor or pointer, it aims at the measured center of its target (getBoundingClientRect), never at fixed pixel coordinates; if the component is scaled, divide by the scale.", "Se houver cursor ou ponteiro, ele mira o centro medido do alvo (getBoundingClientRect), nunca coordenadas fixas; se o componente estiver em escala, divida pela escala."),
  t("Blur only in the middle of a movement and always end at blur(0).", "Desfoque só no meio de um movimento e sempre terminando em blur(0)."),
  t("With prefers-reduced-motion, jump to the final frame and stop (tl.progress(1).pause()).", "Com prefers-reduced-motion, vá para o quadro final e pare (tl.progress(1).pause())."),
  t("In React, use useGSAP from @gsap/react with a scope ref, so the timeline is cleaned up on unmount.", "Em React, use o useGSAP do @gsap/react com uma ref de scope, para a timeline ser limpa ao desmontar."),
  t("All example content stays generic (no real brands, logos or people).", "Todo conteúdo de exemplo é genérico (sem marcas, logos ou pessoas reais)."),
];

const VIDEO: Record<Agent, Text> = {
  claude: t(
    `If I also want this as an MP4 (ads, stories, WhatsApp status), install the HyperFrames plugin with \`${SKILLS.hyperframes.claude[0]}\` and \`${SKILLS.hyperframes.claude[1]}\`, then use /hyperframes:hyperframes to render the same animation in 9:16, 1:1 or 16:9. Rendering needs FFmpeg installed, or render with --docker (downloads about 3.3 GB the first time). Ask me before installing.`,
    `Se eu também quiser em MP4 (anúncio, story, status do WhatsApp), instale o plugin HyperFrames com \`${SKILLS.hyperframes.claude[0]}\` e \`${SKILLS.hyperframes.claude[1]}\` e use /hyperframes:hyperframes para renderizar a mesma animação em 9:16, 1:1 ou 16:9. O render precisa do FFmpeg instalado, ou use --docker (baixa uns 3,3 GB na primeira vez). Pergunte antes de instalar.`,
  ),
  other: t(
    `If I also want this as an MP4 (ads, stories, WhatsApp status), install the HyperFrames skills with \`${SKILLS.hyperframes.other}\` (choose your agent) and render the same animation in 9:16, 1:1 or 16:9. Rendering needs FFmpeg installed, or render with --docker (downloads about 3.3 GB the first time). Ask me before installing.`,
    `Se eu também quiser em MP4 (anúncio, story, status do WhatsApp), instale as skills do HyperFrames com \`${SKILLS.hyperframes.other}\` (escolha o seu agente) e renderize a mesma animação em 9:16, 1:1 ou 16:9. O render precisa do FFmpeg instalado, ou use --docker (baixa uns 3,3 GB na primeira vez). Pergunte antes de instalar.`,
  ),
};

function toolsStep(technique: Technique, agent: Agent, locale: Locale): string {
  const s = SKILLS[technique];
  if (agent === "claude") {
    return technique === "gsap"
      ? locale === "en"
        ? `Check whether the official GSAP skills are installed (gsap-core, gsap-timeline, gsap-react). If they are not, ask me and then run \`${s.claude}\` (choose Claude Code). If they do not show up in this session yet, read the SKILL.md files the installer created for gsap-timeline and gsap-react before writing code.`
        : `Veja se as skills oficiais do GSAP estão instaladas (gsap-core, gsap-timeline, gsap-react). Se não estiverem, me pergunte e rode \`${s.claude}\` (escolha Claude Code). Se ainda não aparecerem nesta sessão, leia os SKILL.md que o instalador criou para gsap-timeline e gsap-react antes de escrever código.`
      : locale === "en"
        ? `Check whether the anatomy skill is installed. If it is not, ask me and then run \`${s.claude}\`. It needs Node 20.10+ and Chrome for its checks. If it does not show up in this session yet, read its SKILL.md (in ~/.claude/skills/anatomy) before starting.`
        : `Veja se a skill anatomy está instalada. Se não estiver, me pergunte e rode \`${s.claude}\`. Ela precisa do Node 20.10+ e do Chrome para as conferências. Se ainda não aparecer nesta sessão, leia o SKILL.md dela (em ~/.claude/skills/anatomy) antes de começar.`;
  }
  // Agentes que cada instalador atende, segundo o README de cada repositório.
  const agents = technique === "gsap" ? "codex, opencode, antigravity" : "codex, opencode, antigravity, minimax-code";
  return locale === "en"
    ? `These instructions were written for Claude Code, which uses "skills" (folders with a SKILL.md that teach it a technique). First find out how you load skills, rules or instructions, and get the same knowledge: (a) if your agent is supported by the skills installer, ask me and run \`${s.other}\` (for example ${agents}); (b) otherwise copy the skill folders from ${s.repo} into your skills or rules directory${technique === "gsap" ? " (in Cursor: Settings → Rules → Remote Rule (GitHub) → greensock/gsap-skills)" : ""}; (c) if you cannot load skills at all, open the SKILL.md files in ${s.repo} and read them as instructions before coding. Tell me which path you used.`
    : `Estas instruções foram feitas para o Claude Code, que usa "skills" (pastas com um SKILL.md que ensinam uma técnica). Primeiro descubra como você carrega skills, regras ou instruções e obtenha o mesmo conhecimento: (a) se o seu agente é suportado pelo instalador de skills, me pergunte e rode \`${s.other}\` (por exemplo ${agents}); (b) se não, copie as pastas das skills de ${s.repo} para a sua pasta de skills ou de regras${technique === "gsap" ? " (no Cursor: Settings → Rules → Remote Rule (GitHub) → greensock/gsap-skills)" : ""}; (c) se não conseguir carregar skills, abra os SKILL.md de ${s.repo} e leia como instruções antes de codar. Me diga qual caminho usou.`;
}

const L = {
  en: {
    intro: (name: string, site: string) => `Recreate the "${name}" animated component from Motionshelf (${site}) in my current project, adapted to my brand. Work in this order:`,
    tools: "Tools",
    project: "Project",
    projectText: {
      gsap: "Look at my project: framework (Next.js, Vite, plain HTML…), TypeScript or JavaScript, Tailwind or plain CSS. Build it as one component that fits this stack. In React use gsap and @gsap/react; in plain HTML use GSAP from npm or a CDN.",
      anatomy:
        "Look at my project: framework (Next.js, Vite, plain HTML…), TypeScript or JavaScript. The anatomy skill builds the figure as plain HTML/SVG or as React (18+); pick the one that fits my stack.",
    },
    ask: "Ask me before coding",
    askText: "Ask me these in a single message, showing the example values as defaults:",
    askLang: "the language of the texts",
    anim: "The animation",
    looks: "What it looks like:",
    steps: "Step by step:",
    rules: "Rules:",
    check: "Check",
    checkText:
      "Run it and watch the first and the third loop (they must look the same). Check it at 390 px wide with no sideways scroll, with reduced motion turned on, and with a clean console. Tell me what you checked.",
    video: "Video (optional)",
    shortcut: "Shortcut",
    shortcutText: (cmd: string) => `If I only want the ready-made component instead, it installs with \`${cmd}\`.`,
  },
  pt: {
    intro: (name: string, site: string) => `Recrie o componente animado "${name}" do Motionshelf (${site}) no meu projeto atual, adaptado à minha marca. Siga esta ordem:`,
    tools: "Ferramentas",
    project: "Projeto",
    projectText: {
      gsap: "Veja o meu projeto: framework (Next.js, Vite, HTML puro…), TypeScript ou JavaScript, Tailwind ou CSS puro. Faça um componente que combine com essa stack. Em React use gsap e @gsap/react; em HTML puro use o GSAP pelo npm ou por CDN.",
      anatomy:
        "Veja o meu projeto: framework (Next.js, Vite, HTML puro…), TypeScript ou JavaScript. A skill anatomy monta a figura em HTML/SVG puro ou em React (18+); escolha o que combina com a minha stack.",
    },
    ask: "Pergunte antes de codar",
    askText: "Me pergunte tudo numa mensagem só, mostrando os valores de exemplo como padrão:",
    askLang: "o idioma dos textos",
    anim: "A animação",
    looks: "Como é:",
    steps: "Passo a passo:",
    rules: "Regras:",
    check: "Conferir",
    checkText:
      "Rode e veja a primeira e a terceira volta (precisam ficar iguais). Confira com 390 px de largura sem rolagem lateral, com movimento reduzido ligado e com o console limpo. Me diga o que conferiu.",
    video: "Vídeo (opcional)",
    shortcut: "Atalho",
    shortcutText: (cmd: string) => `Se eu quiser só o componente pronto, ele instala com \`${cmd}\`.`,
  },
};

/** Monta o prompt de um componente para o Claude Code ou para outro agente. */
export function buildPrompt({ entry, locale, agent, site, install }: { entry: Entry; locale: Locale; agent: Agent; site: string; install: string }): string {
  const r = RECIPES[entry.slug];
  if (!r) return "";
  const l = L[locale];
  const bullet = (x: Text) => `   - ${x[locale]}`;
  // O funil anima com requestAnimationFrame, não com timeline: só a regra de conteúdo genérico vale.
  const rules = [...(r.technique === "gsap" ? GSAP_RULES : GSAP_RULES.slice(-1)), ...(r.extra ?? [])];
  return [
    l.intro(entry.name, site),
    "",
    `1. ${l.tools}: ${toolsStep(r.technique, agent, locale)}`,
    "",
    `2. ${l.project}: ${l.projectText[r.technique]}`,
    "",
    `3. ${l.ask}: ${l.askText}`,
    ...r.adapt.map(bullet),
    `   - ${l.askLang}`,
    "",
    `4. ${l.anim}`,
    `   ${l.looks} ${r.look[locale]}`,
    `   ${l.steps}`,
    ...r.beats.map(bullet),
    `   ${l.rules}`,
    ...rules.map(bullet),
    "",
    `5. ${l.check}: ${l.checkText}`,
    "",
    `6. ${l.video}: ${VIDEO[agent][locale]}`,
    "",
    `${l.shortcut}: ${l.shortcutText(install)}`,
  ].join("\n");
}
