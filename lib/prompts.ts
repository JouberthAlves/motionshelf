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
};

export const techniqueOf = (slug: string): Technique => RECIPES[slug]?.technique ?? "gsap";
export const hasPrompt = (slug: string) => slug in RECIPES;

// Cuidados que valem para todo componente em GSAP.
const GSAP_RULES: Text[] = [
  t("Use one GSAP timeline that loops forever with a short pause between runs (repeat: -1, repeatDelay about 1.4 s).", "Use uma timeline do GSAP em loop, com uma pausa curta entre as voltas (repeat: -1, repeatDelay perto de 1,4 s)."),
  t("Set every starting state with set() at the start of the timeline, never with from(): on the second loop from() starts from the wrong place.", "Defina todo estado inicial com set() no começo da timeline, nunca com from(): na segunda volta o from() começa do lugar errado."),
  t("Elements that appear later stay display:none until their turn, so they do not take space.", "Elementos que aparecem depois ficam com display:none até a vez deles, para não ocupar espaço."),
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
