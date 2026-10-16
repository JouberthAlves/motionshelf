// Catálogo da biblioteca: fonte única para sidebar, busca, etiquetas e páginas.
// O código de cada componente mora em registry/motionshelf/<slug>/<slug>.tsx.

export type Locale = "en" | "pt";
export type Text = Record<Locale, string>;

export type PropDoc = {
  name: string;
  type: string;
  default: string;
  description: Text;
};

export type CategoryId = "text" | "messages" | "commerce" | "location" | "scheduling" | "anatomy";

export type Entry = {
  slug: string;
  name: string;
  category: CategoryId;
  /** Etiqueta de spec do pedestal, ex. "PAY-01". */
  code: string;
  summary: Text;
  dependencies: string[];
  props: PropDoc[];
};

export const CATEGORIES: { id: CategoryId; name: Text }[] = [
  { id: "text", name: { en: "Text", pt: "Texto" } },
  { id: "messages", name: { en: "Messages", pt: "Mensagens" } },
  { id: "commerce", name: { en: "Commerce", pt: "Comércio" } },
  { id: "location", name: { en: "Location", pt: "Localização" } },
  { id: "scheduling", name: { en: "Scheduling", pt: "Agenda" } },
  { id: "anatomy", name: { en: "Anatomy", pt: "Anatomia" } },
];

const p = (name: string, type: string, def: string, en: string, pt: string): PropDoc => ({
  name,
  type,
  default: def,
  description: { en, pt },
});

const deps = ["gsap", "@gsap/react"];
const LOOP = p("loop", "boolean", "true", "Replay forever with a pause between runs.", "Repete sem parar, com uma pausa entre as voltas.");
const ACCENT = (en = "Color of the accent.", pt = "Cor de destaque.") => p("accent", "string", '"#1f5bff"', en, pt);
const CLASS = p("className", "string", '""', "Extra classes for the outer element.", "Classes extras no elemento de fora.");

export const ENTRIES: Entry[] = [
  {
    slug: "title-reveal",
    name: "Title Reveal",
    category: "text",
    code: "TXT-01",
    summary: {
      en: "Each word rises in turn, then a marker draws under the key word.",
      pt: "Cada palavra sobe em sequência e um marcador desenha embaixo da palavra-chave.",
    },
    dependencies: deps,
    props: [
      p("lines", "string[]", '["Animations that", "close the sale."]', "One string per line. Words are separated by spaces.", "Uma string por linha. As palavras são separadas por espaço."),
      p("highlight", "string", '"close"', "The word that gets the highlight marker.", "A palavra que recebe o marcador."),
      p("subtitle", "string", '"Each word rises in turn…"', "Line under the title.", "Linha embaixo do título."),
      ACCENT("Color of the highlight marker.", "Cor do marcador."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "rotating-word",
    name: "Rotating Word",
    category: "text",
    code: "TXT-02",
    summary: {
      en: "One sentence, one word that keeps changing.",
      pt: "Uma frase, uma palavra que não para de trocar.",
    },
    dependencies: deps,
    props: [
      p("prefix", "string", '"Build your next"', "Text before the word that changes.", "Texto antes da palavra que troca."),
      p("words", "string[]", '["landing page", "dashboard", "checkout", "onboarding"]', "Words that take turns in the slot.", "Palavras que se revezam no espaço."),
      p("suffix", "string", '"in minutes."', "Text after the word that changes.", "Texto depois da palavra que troca."),
      ACCENT("Color of the changing word.", "Cor da palavra que troca."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "before-after-text",
    name: "Before and After Text",
    category: "text",
    code: "TXT-03",
    summary: {
      en: "The old way is crossed out and the new way takes its place.",
      pt: "O jeito antigo é riscado e o novo entra no lugar dele.",
    },
    dependencies: deps,
    props: [
      p("title", "string", '"Before and after"', "Heading above the rows.", "Título acima das linhas."),
      p("rows", "{ before: string; after: string }[]", "three example rows", "Each row: the old way and the new way.", "Cada linha: o jeito antigo e o novo."),
      ACCENT("Color of the new way.", "Cor do jeito novo."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "chat-flow",
    name: "Chat Flow",
    category: "messages",
    code: "MSG-01",
    summary: {
      en: "From a button to a chat: picks, a sent message, typing dots and a reply.",
      pt: "Do botão à conversa: escolhas, mensagem enviada, digitando e resposta.",
    },
    dependencies: deps,
    props: [
      p("brand", "string", '"Acme"', "Business name in the chat header.", "Nome do negócio no cabeçalho do chat."),
      p("title", "string", '"Book a demo."', "Headline of the landing block.", "Título do bloco de entrada."),
      p("options", "string[]", '["Starter", "Pro", "Team"]', "Choices in the first row.", "Opções da primeira linha."),
      p("slots", "string[]", '["Tue 10am", "Wed 2pm", "Thu 4pm"]', "Choices in the second row.", "Opções da segunda linha."),
      p("picked", "[number, number]", "[1, 1]", "Which choice the cursor picks: [option, slot].", "Qual opção o cursor escolhe: [opção, horário]."),
      p("button", "string", '"Chat with us"', "Label of the button that opens the chat.", "Texto do botão que abre o chat."),
      p("message", "string", '"Hi! I\'d like to book a demo…"', "Message the visitor sends.", "Mensagem que o visitante envia."),
      p("reply", "string", '"Confirmed! See you Wednesday at 2pm."', "Reply that comes back.", "Resposta que volta."),
      p("time", "string", '"10:42"', "Time shown on the bubbles.", "Hora mostrada nas mensagens."),
      ACCENT("Color of the button.", "Cor do botão."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "question-typer",
    name: "Question Typer",
    category: "messages",
    code: "MSG-02",
    summary: {
      en: "Each question is typed out and its answer appears right under it, changing with every question.",
      pt: "Cada pergunta é digitada e a resposta aparece logo abaixo, mudando a cada pergunta.",
    },
    dependencies: deps,
    props: [
      p("items", "{ question, answer }[]", "three example pairs", "Each question is typed out, then its answer appears under it.", "Cada pergunta é digitada e a resposta dela aparece embaixo."),
      p("answerLabel", "string", '"Answer"', "Label above the answer.", "Rótulo acima da resposta."),
      ACCENT("Accent of the bar and the answer mark.", "Cor da barra e da marca da resposta."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "appointment-reminder",
    name: "Appointment Reminder",
    category: "messages",
    code: "MSG-03",
    summary: {
      en: "A reminder with buttons: the customer taps Confirm and the confirmation comes back.",
      pt: "Um lembrete com botões: o cliente toca em Confirmar e a confirmação volta.",
    },
    dependencies: deps,
    props: [
      p("business", "string", '"Acme"', "Business name in the chat header.", "Nome do negócio no cabeçalho do chat."),
      p("name", "string", '"Sam"', "Customer first name.", "Primeiro nome do cliente."),
      p("day", "string", '"tomorrow"', "When the appointment is.", "Quando é o compromisso."),
      p("time", "string", '"9:30 AM"', "Time of the appointment.", "Horário do compromisso."),
      ACCENT(),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "payment-notification",
    name: "Payment Notification",
    category: "commerce",
    code: "PAY-01",
    summary: {
      en: "A payment lands on the lock screen, the app opens and the amount counts up.",
      pt: "Um pagamento chega na tela bloqueada, o app abre e o valor sobe até o total.",
    },
    dependencies: deps,
    props: [
      p("amount", "number", "150", "Amount the counter climbs to.", "Valor até onde o contador sobe."),
      p("currency", "string", '"USD"', "ISO 4217 currency code.", "Código da moeda (ISO 4217)."),
      p("locale", "string", '"en-US"', "Locale used to format the amount.", "Idioma usado para formatar o valor."),
      p("sender", "string", '"Alex M."', "Who sent the payment.", "Quem enviou o pagamento."),
      p("reference", "string", '"Order #1042"', "What the payment was for.", "A que se refere o pagamento."),
      p("title", "string", '"Payment received"', "Notification title.", "Título da notificação."),
      p("appName", "string", '"Bank"', "App name shown on the notification.", "Nome do app mostrado na notificação."),
      p("time", "string", '"14:02"', "Clock on the lock screen.", "Relógio da tela bloqueada."),
      p("date", "string", '"Saturday, October 18"', "Date line under the clock.", "Linha de data embaixo do relógio."),
      ACCENT("Color of the app icon and the check.", "Cor do ícone do app e do check."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "search-ad",
    name: "Search Ad",
    category: "commerce",
    code: "PAY-02",
    summary: {
      en: "A search types out, the results show up, and the sponsored result is highlighted.",
      pt: "Uma busca é digitada, os resultados aparecem e o anúncio ganha destaque.",
    },
    dependencies: deps,
    props: [
      p("query", "string", '"running shoes"', "Text typed into the search box.", "Texto digitado na busca."),
      p("adDomain", "string", '"example.com"', "Domain shown on the sponsored result.", "Domínio do resultado patrocinado."),
      p("adTitle", "string", '"Brand · Running shoes on sale"', "Title of the sponsored result.", "Título do resultado patrocinado."),
      p("adText", "string", '"Free shipping over $50…"', "Description of the sponsored result.", "Descrição do resultado patrocinado."),
      p("organicDomain", "string", '"reviews.example"', "Domain of the organic result.", "Domínio do resultado orgânico."),
      p("organicTitle", "string", '"The best running shoes of the year"', "Title of the organic result.", "Título do resultado orgânico."),
      p("organicText", "string", '"We compared the top picks…"', "Description of the organic result.", "Descrição do resultado orgânico."),
      p("cta", "string", '"Visit store"', "Button shown under the results.", "Botão mostrado embaixo dos resultados."),
      ACCENT("Color of the highlight and the button.", "Cor do destaque e do botão."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "map-pin-drop",
    name: "Map Pin Drop",
    category: "location",
    code: "MAP-01",
    summary: {
      en: "A pin drops on the map, bounces, and the address card slides up.",
      pt: "Um pino cai no mapa, quica e o card com o endereço sobe.",
    },
    dependencies: deps,
    props: [
      p("title", "string", '"Headquarters"', "Name shown on the address card.", "Nome mostrado no card de endereço."),
      p("address", "string", '"123 Example Street"', "Address shown under the name.", "Endereço mostrado embaixo do nome."),
      p("action", "string", '"Open in maps"', "Button label on the card.", "Texto do botão no card."),
      ACCENT("Color of the pin, the ring and the button.", "Cor do pino, do anel e do botão."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "slot-booking",
    name: "Slot Booking",
    category: "scheduling",
    code: "SLT-01",
    summary: {
      en: "A time slot fills with color and the booking is confirmed.",
      pt: "Um horário é preenchido com cor e a reserva é confirmada.",
    },
    dependencies: deps,
    props: [
      p("day", "string", '"Saturday"', "Day heading.", "Título do dia."),
      p("slots", "string[]", "ten example times", "Time slots, in order.", "Horários, em ordem."),
      p("busy", "number[]", "[0, 2, 3, 6, 8, 9]", "Indexes of the slots that are already taken.", "Índices dos horários já ocupados."),
      p("picked", "number", "4", "Index of the slot the pointer picks.", "Índice do horário que o ponteiro escolhe."),
      p("toast", "string", '"Booked"', "Label shown in the confirmation bar.", "Texto da barra de confirmação."),
      ACCENT("Color of the picked slot and the confirmation label.", "Cor do horário escolhido e do texto de confirmação."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "sales-funnel",
    name: "Sales Funnel",
    category: "anatomy",
    code: "FNL-01",
    summary: {
      en: "A sales funnel as a sieve: people drop out at each stage and only the booked ones reach the bin.",
      pt: "Um funil de vendas como peneira: cada etapa deixa gente de fora, e só os agendados chegam ao recipiente.",
    },
    dependencies: deps,
    props: [
      p("rates", "[number, number, number]", "[0.3, 0.35, 0.4]", "Chance that someone who reaches each stage moves on.", "Chance de quem chega a cada etapa avançar."),
      CLASS,
    ],
  },
  {
    slug: "roi-balance",
    name: "ROI Balance",
    category: "anatomy",
    code: "ROI-01",
    summary: {
      en: "A bench balance weighs ad budget against the revenue it brings in; the pointer reads the return, and more budget brings it back toward break-even.",
      pt: "Uma balança de bancada pesa a verba do anúncio contra o faturamento que ela traz; o ponteiro marca o retorno, e mais verba o aproxima do empate.",
    },
    dependencies: [],
    props: [
      p("conversion", "number", "0.03", "Share of clicks that buy (0.03 = 3%).", "Parcela dos cliques que compram (0,03 = 3%)."),
      p("ticket", "number", "150", "Average order value.", "Valor médio de cada venda."),
      p("currency", "string", '"$"', "Currency symbol used in the readout.", "Símbolo da moeda na leitura."),
      CLASS,
    ],
  },
  {
    slug: "page-speed-gauge",
    name: "Page Speed Gauge",
    category: "anatomy",
    code: "SPD-01",
    summary: {
      en: "The heavier the page, the longer the stopwatch runs and the more visitors a pusher takes off the belt before they reach the door.",
      pt: "Quanto mais pesada a página, mais o cronômetro corre e mais visitantes um empurrador tira da esteira antes de chegarem à porta.",
    },
    dependencies: [],
    props: [
      p("bounceAt1s", "number", "0.2", "Share of visitors who leave when the page loads in 1 s.", "Parcela dos visitantes que sai quando a página carrega em 1 s."),
      p("speed", "number", "1", "Connection speed in MB per second.", "Velocidade da conexão, em MB por segundo."),
      CLASS,
    ],
  },
];

export const bySlug = (slug: string) => ENTRIES.find((e) => e.slug === slug);
export const inCategory = (id: CategoryId) => ENTRIES.filter((e) => e.category === id);
