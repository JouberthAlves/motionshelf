// Catálogo da biblioteca: fonte única para sidebar, busca, etiquetas e páginas.
// O código de cada componente mora em registry/motionshelf/<slug>/<slug>.tsx.

export type Locale = "en";
export type Text = Record<Locale, string>;

export type PropDoc = {
  name: string;
  type: string;
  default: string;
  description: Text;
};

export type CategoryId = "text" | "messages" | "commerce" | "proof" | "location" | "scheduling" | "anatomy" | "buttons" | "loaders";

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

// Em ordem alfabética: é a ordem da lateral e do filtro da galeria. A vitrine da home segue a ordem de ENTRIES.
export const CATEGORIES: { id: CategoryId; name: Text }[] = [
  { id: "anatomy", name: { en: "Anatomy" } },
  { id: "buttons", name: { en: "Buttons" } },
  { id: "commerce", name: { en: "Commerce" } },
  { id: "loaders", name: { en: "Loaders" } },
  { id: "location", name: { en: "Location" } },
  { id: "messages", name: { en: "Messages" } },
  { id: "scheduling", name: { en: "Scheduling" } },
  { id: "proof", name: { en: "Social proof" } },
  { id: "text", name: { en: "Text" } },
];

const p = (name: string, type: string, def: string, en: string): PropDoc => ({
  name,
  type,
  default: def,
  description: { en },
});

const deps = ["gsap", "@gsap/react"];
const LOOP = p("loop", "boolean", "true", "Replay forever with a pause between runs.");
const ACCENT = (en = "Color of the accent.") => p("accent", "string", '"#1f5bff"', en);
const CLASS = p("className", "string", '""', "Extra classes for the outer element.");

export const ENTRIES: Entry[] = [
  {
    slug: "title-reveal",
    name: "Title Reveal",
    category: "text",
    code: "TXT-01",
    summary: {
      en: "Each word rises in turn, then a marker draws under the key word.",
    },
    dependencies: deps,
    props: [
      p("lines", "string[]", '["Animations that", "close the sale."]', "One string per line. Words are separated by spaces."),
      p("highlight", "string", '"close"', "The word that gets the highlight marker."),
      p("subtitle", "string", '"Each word rises in turn…"', "Line under the title."),
      ACCENT("Color of the highlight marker."),
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
    },
    dependencies: deps,
    props: [
      p("prefix", "string", '"Build your next"', "Text before the word that changes."),
      p("words", "string[]", '["landing page", "dashboard", "checkout", "onboarding"]', "Words that take turns in the slot."),
      p("suffix", "string", '"in minutes."', "Text after the word that changes."),
      ACCENT("Color of the changing word."),
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
    },
    dependencies: deps,
    props: [
      p("title", "string", '"Before and after"', "Heading above the rows."),
      p("rows", "{ before: string; after: string }[]", "three example rows", "Each row: the old way and the new way."),
      ACCENT("Color of the new way."),
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
    },
    dependencies: deps,
    props: [
      p("brand", "string", '"Acme"', "Business name in the chat header."),
      p("title", "string", '"Book a demo."', "Headline of the landing block."),
      p("options", "string[]", '["Starter", "Pro", "Team"]', "Choices in the first row."),
      p("slots", "string[]", '["Tue 10am", "Wed 2pm", "Thu 4pm"]', "Choices in the second row."),
      p("picked", "[number, number]", "[1, 1]", "Which choice the cursor picks: [option, slot]."),
      p("button", "string", '"Chat with us"', "Label of the button that opens the chat."),
      p("message", "string", '"Hi! I\'d like to book a demo…"', "Message the visitor sends."),
      p("reply", "string", '"Confirmed! See you Wednesday at 2pm."', "Reply that comes back."),
      p("time", "string", '"10:42"', "Time shown on the bubbles."),
      ACCENT("Color of the button."),
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
    },
    dependencies: deps,
    props: [
      p("items", "{ question, answer }[]", "three example pairs", "Each question is typed out, then its answer appears under it."),
      p("answerLabel", "string", '"Answer"', "Label above the answer."),
      ACCENT("Accent of the bar and the answer mark."),
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
    },
    dependencies: deps,
    props: [
      p("business", "string", '"Acme"', "Business name in the chat header."),
      p("name", "string", '"Sam"', "Customer first name."),
      p("day", "string", '"tomorrow"', "When the appointment is."),
      p("time", "string", '"9:30 AM"', "Time of the appointment."),
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
    },
    dependencies: deps,
    props: [
      p("amount", "number", "150", "Amount the counter climbs to."),
      p("currency", "string", '"USD"', "ISO 4217 currency code."),
      p("locale", "string", '"en-US"', "Locale used to format the amount."),
      p("sender", "string", '"Alex M."', "Who sent the payment."),
      p("reference", "string", '"Order #1042"', "What the payment was for."),
      p("title", "string", '"Payment received"', "Notification title."),
      p("appName", "string", '"Bank"', "App name shown on the notification."),
      p("time", "string", '"14:02"', "Clock on the lock screen."),
      p("date", "string", '"Saturday, October 18"', "Date line under the clock."),
      ACCENT("Color of the app icon and the check."),
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
    },
    dependencies: deps,
    props: [
      p("query", "string", '"running shoes"', "Text typed into the search box."),
      p("adDomain", "string", '"example.com"', "Domain shown on the sponsored result."),
      p("adTitle", "string", '"Brand · Running shoes on sale"', "Title of the sponsored result."),
      p("adText", "string", '"Free shipping over $50…"', "Description of the sponsored result."),
      p("organicDomain", "string", '"reviews.example"', "Domain of the organic result."),
      p("organicTitle", "string", '"The best running shoes of the year"', "Title of the organic result."),
      p("organicText", "string", '"We compared the top picks…"', "Description of the organic result."),
      p("cta", "string", '"Visit store"', "Button shown under the results."),
      ACCENT("Color of the highlight and the button."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "add-to-cart",
    name: "Add to Cart",
    category: "commerce",
    code: "CRT-01",
    summary: {
      en: "A click on the button sends the product flying into the cart; the badge bumps and the total climbs.",
    },
    dependencies: deps,
    props: [
      p("store", "string", '"Studio Shop"', "Store name in the top bar."),
      p("product", "string", '"Stoneware Mug"', "Product name."),
      p("detail", "string", '"Handmade · 350 ml"', "Short line under the product name."),
      p("price", "number", "24", "Product price."),
      p("items", "number", "2", "Items already in the cart before the click."),
      p("total", "number", "58", "Cart total before the click."),
      p("currency", "string", '"USD"', "ISO 4217 currency code."),
      p("locale", "string", '"en-US"', "Locale used to format the prices."),
      p("cta", "string", '"Add to cart"', "Button text before the click."),
      p("added", "string", '"Added"', "Button text after the click."),
      ACCENT("Color of the button, the badge and the product tile."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "plan-toggle",
    name: "Plan Toggle",
    category: "commerce",
    code: "PLN-01",
    summary: {
      en: "The switch slides from monthly to yearly, the prices roll like an odometer and the discount badge pops in.",
    },
    dependencies: deps,
    props: [
      p("plans", "Plan[]", "3 plans", "Plans in order: name, monthly and yearly price per month (whole numbers), features."),
      p("featured", "number", "1", "Index of the highlighted plan."),
      p("featuredLabel", "string", '"Popular"', "Badge on the highlighted plan."),
      p("currency", "string", '"$"', "Currency symbol before the price."),
      p("period", "string", '"/mo"', "Text after the price."),
      p("labels", "[string, string]", '["Monthly", "Yearly"]', "Labels of the two sides of the switch."),
      p("discount", "string", '"-20%"', "Badge next to the yearly label."),
      p("billing", "[string, string]", '["billed monthly", "billed yearly"]', "Line under the price on each side."),
      ACCENT("Color of the switch, the badge and the highlighted plan."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "offer-countdown",
    name: "Offer Countdown",
    category: "commerce",
    code: "CNT-01",
    summary: {
      en: "A flip clock counts down to the real end of the offer, next to the real stock left.",
    },
    dependencies: deps,
    props: [
      p("endsAt", "string | number", "—", "When the offer ends (ISO date or timestamp in ms). Use the real deadline."),
      p("demoSeconds", "number", "8025", "Without endsAt (demo only): seconds left when it mounts."),
      p("title", "string", '"Launch offer"', "Small label at the top."),
      p("subtitle", "string", '"Ends in"', "Line above the clock."),
      p("labels", "[string, string, string]", '["Hours", "Minutes", "Seconds"]', "Labels under the clock groups."),
      p("stock", "number", "7", "Units actually left. Use the real number."),
      p("total", "number", "40", "Units at the start of the offer."),
      p("stockLabel", "string", '"Only {n} left at this price"', "Stock line; {n} becomes the number left."),
      p("endedLabel", "string", '"This offer has ended"', "Text shown when the time is over."),
      ACCENT("Color of the dot and the stock bar."),
      CLASS,
    ],
  },
  {
    slug: "review-card",
    name: "Review Card",
    category: "proof",
    code: "REV-01",
    summary: {
      en: "The stars light up one by one, the rating and the review count climb, and the reviews take turns.",
    },
    dependencies: deps,
    props: [
      p("rating", "number", "4.9", "Average rating, from 0 to 5."),
      p("count", "number", "312", "Total number of reviews."),
      p("reviews", "Review[]", "3 reviews", "Reviews shown in turn: name, text and when."),
      p("title", "string", '"Customer reviews"', "Heading above the rating."),
      p("countLabel", "string", '"reviews"', "Word after the review count."),
      p("locale", "string", '"en-US"', "Locale used to format the numbers."),
      p("starColor", "string", '"#f5b400"', "Color of the stars."),
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
    },
    dependencies: deps,
    props: [
      p("title", "string", '"Headquarters"', "Name shown on the address card."),
      p("address", "string", '"123 Example Street"', "Address shown under the name."),
      p("action", "string", '"Open in maps"', "Button label on the card."),
      ACCENT("Color of the pin, the ring and the button."),
      LOOP,
      CLASS,
    ],
  },
  {
    slug: "order-tracker",
    name: "Order Tracker",
    category: "location",
    code: "TRK-01",
    summary: {
      en: "Each stage checks off, the courier rides the route on the map and the time left counts down to delivered.",
    },
    dependencies: deps,
    props: [
      p("order", "string", '"Order #2481"', "Order name or number in the header."),
      p("steps", "[string, string, string, string]", '["Order placed", …]', "The four stages, in order."),
      p("times", "[string, string, string, string]", '["14:02", …]', "Time next to each stage."),
      p("eta", "number", "12", "Minutes left when the courier leaves."),
      p("etaLabel", "string", '"Arrives in"', "Text before the minutes."),
      p("minutesLabel", "string", '"min"', "Word after the minutes."),
      p("deliveredLabel", "string", '"Delivered"', "Text that replaces the countdown at the end."),
      ACCENT("Color of the route, the checks and the courier."),
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
    },
    dependencies: deps,
    props: [
      p("day", "string", '"Saturday"', "Day heading."),
      p("slots", "string[]", "ten example times", "Time slots, in order."),
      p("busy", "number[]", "[0, 2, 3, 6, 8, 9]", "Indexes of the slots that are already taken."),
      p("picked", "number", "4", "Index of the slot the pointer picks."),
      p("toast", "string", '"Booked"', "Label shown in the confirmation bar."),
      ACCENT("Color of the picked slot and the confirmation label."),
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
    },
    dependencies: [],
    props: [
      p("rates", "[number, number, number]", "[0.3, 0.35, 0.4]", "Chance that someone who reaches each stage moves on."),
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
    },
    dependencies: [],
    props: [
      p("conversion", "number", "0.03", "Share of clicks that buy (0.03 = 3%)."),
      p("ticket", "number", "150", "Average order value."),
      p("currency", "string", '"$"', "Currency symbol used in the readout."),
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
    },
    dependencies: [],
    props: [
      p("bounceAt1s", "number", "0.2", "Share of visitors who leave when the page loads in 1 s."),
      p("speed", "number", "1", "Connection speed in MB per second."),
      CLASS,
    ],
  },
  {
    slug: "drone-button",
    name: "Drone Button",
    category: "buttons",
    code: "DRN-01",
    summary: {
      en: "A button carried by a drone: it rests on its skids, spools up its rotors when the pointer comes in, flies to the cursor banking like a real quadcopter, kicks up dust near the floor and lands when the pointer leaves.",
    },
    dependencies: [],
    props: [
      p("children", "ReactNode", "—", "The button label."),
      p("maxTilt", "number", "24", "Maximum bank in degrees while the drone flies sideways."),
      p("agility", "number", "1", "How hard the autopilot chases the pointer; lower drifts, higher snaps."),
      p("dust", "boolean", "true", "Kick up dust when the rotor wash reaches the floor."),
      p("playgroundClassName", "string", '""', "Classes for the flight area, which fills the nearest positioned ancestor."),
      p("className", "string", '""', "Extra classes for the button."),
    ],
  },
  {
    slug: "claw-button",
    name: "Claw Machine",
    category: "buttons",
    code: "CLW-01",
    summary: {
      en: "An arcade claw rides a rail after the pointer; click the button and the claw grabs it, swings it over to the prize chute and drops it in, then a fresh one pops up.",
    },
    dependencies: [],
    props: [
      p("children", "ReactNode", "—", "The button label."),
      p("chute", '"left" | "right"', '"right"', "Side of the prize chute."),
      p("onComplete", "() => void", "—", "Called when the button drops into the chute, at the end of the grab."),
      p("playgroundClassName", "string", '""', "Classes for the play area, which fills the nearest positioned ancestor."),
      p("className", "string", '""', "Extra classes for the button."),
    ],
  },
  {
    slug: "rocket-button",
    name: "Rocket Launch",
    category: "buttons",
    code: "RKT-01",
    summary: {
      en: "A button strapped between two boosters on a launch pad: click it for a 3-2-1 countdown, liftoff with flames and smoke, and a parachute ride back down to the pad.",
    },
    dependencies: [],
    props: [
      p("children", "ReactNode", "—", "The button label."),
      p("onLaunch", "() => void", "—", "Called at liftoff, right after the countdown."),
      p("onLand", "() => void", "—", "Called when the button is back on the pad under its parachute."),
      p("playgroundClassName", "string", '""', "Classes for the flight area, which fills the nearest positioned ancestor."),
      p("className", "string", '""', "Extra classes for the button."),
    ],
  },
  {
    slug: "ufo-button",
    name: "UFO Abduction",
    category: "buttons",
    code: "UFO-01",
    summary: {
      en: "A flying saucer prowls the top of the area; bring the pointer near the button and it beams it up to hover in the light, still clickable, until the pointer leaves.",
    },
    dependencies: [],
    props: [
      p("children", "ReactNode", "—", "The button label."),
      p("range", "number", "140", "How close the pointer must get to the button, in px, before the saucer beams it up."),
      p("playgroundClassName", "string", '""', "Classes for the play area, which fills the nearest positioned ancestor."),
      p("className", "string", '""', "Extra classes for the button."),
    ],
  },
  {
    slug: "magnet-button",
    name: "Magnet",
    category: "buttons",
    code: "MAG-01",
    summary: {
      en: "The pointer becomes a horseshoe magnet: iron filings behind the button line up along the field between it and the button, and the button leans toward it on a spring.",
    },
    dependencies: [],
    props: [
      p("children", "ReactNode", "—", "The button label."),
      p("pull", "number", "36", "How far the button can be pulled toward the pointer, in px."),
      p("playgroundClassName", "string", '""', "Classes for the play area, which fills the nearest positioned ancestor."),
      p("className", "string", '""', "Extra classes for the button."),
    ],
  },
  {
    slug: "letters-button",
    name: "Falling Letters",
    category: "buttons",
    code: "LTR-01",
    summary: {
      en: "Hover the button and its letters drop out one by one, bounce and pile up on the floor; move away and they spring back into place.",
    },
    dependencies: [],
    props: [
      p("label", "string", "—", "The button text; each letter falls on its own."),
      p("playgroundClassName", "string", '""', "Classes for the play area, which fills the nearest positioned ancestor."),
      p("className", "string", '""', "Extra classes for the button."),
    ],
  },
  {
    slug: "hourglass-loader",
    name: "Hourglass",
    category: "loaders",
    code: "HRG-01",
    summary: {
      en: "A glass hourglass whose sand really falls: the top sinks into a funnel, the bottom grows into a cone with grains rolling down, and it flips itself when the top runs out. Pass progress to show real loading.",
    },
    dependencies: [],
    props: [
      p("progress", "number", "—", "0 to 1. When set, the sand follows real progress and the hourglass never flips; at 1 the top is empty."),
      p("duration", "number", "4", "Seconds the sand takes to run through in the looping mode."),
      p("onFlip", "() => void", "—", "Called each time the hourglass starts a flip."),
      p("size", "number", "160", "Height in px; the width follows."),
      p("label", "string", '"Loading"', "Accessible name."),
      CLASS,
    ],
  },
];

export const bySlug = (slug: string) => ENTRIES.find((e) => e.slug === slug);
/** A stack que o componente usa de verdade, para a placa do pedestal. */
export const stackOf = (entry: Entry) => (entry.dependencies.includes("gsap") ? "React · GSAP" : "React");
export const inCategory = (id: CategoryId) => ENTRIES.filter((e) => e.category === id);
