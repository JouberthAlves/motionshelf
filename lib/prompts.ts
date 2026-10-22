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

const t = (en: string): Text => ({ en });

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
    ),
    beats: [
      t("Each word sits in its own overflow-hidden line wrapper and starts pushed down (yPercent 110) and blurred (8px)."),
      t("At 0.2 s the words rise to place one after another (stagger 0.08 s, 0.85 s each, ease expo.out), losing the blur."),
      t("At 1.0 s the marker behind the key word grows from the left (scaleX 0 → 1, 0.65 s, expo.inOut)."),
      t("At 1.3 s the key word turns white so it reads on the marker."),
      t("At 1.4 s the subtitle fades up from 10 px below, then everything holds for 2 s and the loop restarts after 1.6 s."),
    ],
    adapt: [
      t("the headline lines and which word gets the marker"),
      t("the subtitle"),
      t("the marker color"),
    ],
    extra: [t("The headline color is inherited from the page; only the key word is forced to white while it sits on the marker.")],
  },
  "rotating-word": {
    technique: "gsap",
    look: t(
      "One sentence where a single word keeps changing, for example \"Build your next / landing page / in minutes.\" The changing word is in the accent color.",
    ),
    beats: [
      t("The changing words are stacked in a vertical track inside a slot one line tall with overflow hidden; the first word is repeated at the end so the loop is seamless."),
      t("Every 1.3 s the track moves up one word (yPercent step, 0.55 s, expo.inOut) with a short blur (3 px) only in the middle of the move."),
      t("After the repeated first word, the track jumps back to the start without animation and the loop continues."),
    ],
    adapt: [
      t("the text before the word, the words that rotate and the text after"),
      t("the accent color of the word"),
    ],
    extra: [
      t("Put the text after the word on its own line, so a short word never leaves a gap and the sentence never reflows when the word changes."),
      t("The slot is as wide as the longest word, measured once."),
    ],
  },
  "before-after-text": {
    technique: "gsap",
    look: t(
      "A small heading and three rows. Each row shows an old way of doing something; it gets crossed out and the new way appears in its place, with a colored dot.",
    ),
    beats: [
      t("The heading fades in (0.5 s) and the old texts slide in from the left with a slight blur, one after another (stagger 0.12 s)."),
      t("From 1.2 s, row by row every 0.9 s: a strike line grows across the old text (scaleX, 0.45 s), the old text leaves upward with blur, and the new text rises in (0.7 s, expo.out)."),
      t("Everything holds 1.8 s and the loop restarts."),
    ],
    adapt: [
      t("the heading"),
      t("each row: the old way and the new way"),
      t("the accent color of the new way"),
    ],
    extra: [t("Old and new texts share the same spot in each row (stacked), so nothing jumps when they swap.")],
  },
  "chat-flow": {
    technique: "gsap",
    look: t(
      "A phone mockup. First a small landing block with a title, two rows of choice chips and a button; then a chat screen with a header, the visitor's message, typing dots and a reply.",
    ),
    beats: [
      t("A round cursor moves to a chip in the first row (0.6 s), presses it (scale down and back) and the chip fills with the dark color; then the same in the second row."),
      t("The cursor moves to the button, presses it, and fades out."),
      t("At 2.85 s the chat slides in from the right. The visitor's message types out letter by letter (1.4 s), then the read ticks turn blue."),
      t("The header status changes to \"typing…\", three dots bounce, then the reply bubble pops in (back.out) and the status goes back to \"online\"."),
    ],
    adapt: [
      t("the business name, the title and the two rows of choices"),
      t("which choices the cursor picks"),
      t("the button label, the visitor's message and the reply (the message should mention the picked choices)"),
      t("the button color"),
    ],
    extra: [t("Do not copy the look of a real messaging app (logo, exact colors); keep it a generic chat.")],
  },
  "question-typer": {
    technique: "gsap",
    look: t(
      "A dark card with a colored bar on the left. A question types itself out, and its answer appears under it in a box with a small label.",
    ),
    beats: [
      t("The question types out at 0.045 s per letter, with a blinking caret (steps ease, its own loop outside the main timeline)."),
      t("0.35 s later the answer box rises in with a blur that clears, and the answer writes itself faster (0.022 s per letter)."),
      t("After 1.6 s the answer box fades up and out and the question erases quickly; then the next question starts. After the last one, the loop restarts."),
    ],
    adapt: [
      t("the questions and the answer to each one"),
      t("the label above the answer"),
      t("the accent color"),
    ],
    extra: [t("With reduced motion, stop on the first question already answered.")],
  },
  "appointment-reminder": {
    technique: "gsap",
    look: t(
      "A phone with a business chat: a reminder message with two buttons (Confirm and Reschedule) under it.",
    ),
    beats: [
      t("At 0.4 s the reminder bubble pops in (back.out); at 0.8 s the two buttons appear under it."),
      t("At 1.7 s a round cursor appears and moves to the Confirm button (0.6 s), presses it, and the button tints."),
      t("The buttons collapse (height to 0), the customer's \"Confirm\" bubble appears on the right, and at 3.6 s the business replies with the confirmation."),
    ],
    adapt: [
      t("the business name and the customer's first name"),
      t("the day and time of the appointment, and the confirmation text"),
      t("the header and button color"),
    ],
    extra: [t("The bubbles that appear later use display:none until their turn, and the button area gets its height back at the start of each loop (clearProps).")],
  },
  "payment-notification": {
    technique: "gsap",
    look: t(
      "A phone lock screen with a large clock. A payment notification drops in from the top; then the bank app opens with a check mark and the amount counting up.",
    ),
    beats: [
      t("At 0.6 s the notification drops from above (y -110 → 0, 0.6 s, back.out(1.6))."),
      t("At 2.0 s it gets a quick tap (scale 0.97 and back), and at 2.3 s the app screen fades in over the lock screen."),
      t("A round check badge pops in (back.out(2)) and its check mark draws itself (stroke-dashoffset to 0)."),
      t("At 2.8 s the amount counts from 0 to the total in 1.3 s (power2.out), formatted with Intl.NumberFormat in the chosen currency; at 3.6 s the reference line fades in."),
    ],
    adapt: [
      t("the amount, currency and number format (e.g. BRL with pt-BR)"),
      t("who sent it, what it was for, and the app name"),
      t("the accent color of the app icon and the check"),
    ],
    extra: [t("Use a generic bank icon; do not copy the logo of a real bank or payment method.")],
  },
  "search-ad": {
    technique: "gsap",
    look: t(
      "A search page: a rounded search box, a sponsored result with a colored outline, an organic result below it, and a button.",
    ),
    beats: [
      t("The caret blinks, then at 0.4 s the query types itself out in 1.3 s."),
      t("At 2.0 s the results rise in one after another; the organic result stays at 55% opacity so the sponsored one stands out."),
      t("At 2.7 s the sponsored result pulses once (scale 1.03 and back); at 3.2 s the button appears."),
    ],
    adapt: [
      t("the search query"),
      t("the sponsored result (domain, title, description) and the organic one"),
      t("the button label and the accent color"),
    ],
    extra: [t("Keep it a generic search page; do not reproduce the logo or exact layout of a real search engine.")],
  },
  "map-pin-drop": {
    technique: "gsap",
    look: t(
      "A simple illustrated map (light blocks, white streets, a strip of water). A pin drops on it and an address card slides up from the bottom.",
    ),
    beats: [
      t("At 0.4 s the pin falls from 160 px above and bounces (0.55 s, bounce.out); its shadow grows under it at the same time."),
      t("At 0.95 s a ring pulses out from the pin twice (scale 0.3 → 1.8 while fading)."),
      t("At 1.4 s the address card slides up (back.out(1.4)); at 2.6 s its button gets a quick tap."),
    ],
    adapt: [
      t("the place name, the address and the button label"),
      t("the accent color of the pin, ring and button"),
    ],
    extra: [
      t("The pin's tip lands exactly on the center of its shadow: position the wrapper, animate the pin inside it."),
      t("The map is a drawing, not a real map; no map API is needed."),
    ],
  },
  "slot-booking": {
    technique: "gsap",
    look: t(
      "A day with a grid of time slots; some are taken (dark). A pointer picks a free slot, it fills with color, and a confirmation bar appears.",
    ),
    beats: [
      t("At 0.3 s a round pointer moves to the picked slot (0.8 s, power2.inOut) and presses it."),
      t("At 1.2 s the slot fills with the accent color from the bottom (scaleY 0 → 1) and the pointer fades out."),
      t("At 1.6 s the confirmation bar pops up with the day, the time and a short label."),
    ],
    adapt: [
      t("the day, the list of times, which ones are taken and which one is picked"),
      t("the confirmation label and the accent color"),
    ],
  },
  "add-to-cart": {
    technique: "gsap",
    look: t(
      "A small store mockup: a top bar with the store name, the cart total and a round cart icon with a count badge; below it a product card with a square product tile, name, one detail line, price and a full-width \"Add to cart\" button. A round pointer rests near the bottom left.",
    ),
    beats: [
      t("At 0.4 s the pointer travels to the measured center of the button (0.8 s, power2.inOut) and presses it at 1.25 s (pointer scale 0.7 and button scale 0.96, yoyo)."),
      t("At 1.4 s the button text slides up and out and \"Added\" with a check slides in (back.out(2)); the pointer fades."),
      t("At 1.45 s a small copy of the product tile flies to the cart in 0.75 s: x with power1.in, y with back.in(2.2) so it arcs up before dropping in, and it shrinks to 35%. Start and end are measured from the tile and the cart icon."),
      t("At 2.2 s the cart wobbles (rotation -8°, yoyo), the badge number goes up by one and pops from scale 1.6 to 1 (back.out(3)), and the total counts up by the price in 0.6 s, formatted with Intl.NumberFormat."),
    ],
    adapt: [
      t("the store name, the product (name, detail, price, photo) and the currency"),
      t("how many items and what total the cart has before the click"),
      t("the button texts and the accent color"),
    ],
    extra: [t("The flying copy is a separate absolutely positioned element; never move the real product tile.")],
  },
  "plan-toggle": {
    technique: "gsap",
    look: t(
      "A pricing block: a pill switch with \"Monthly\" and \"Yearly\" (a colored thumb behind the active side) and a small discount badge; below it three plan cards side by side, the middle one highlighted with a colored border and a \"Popular\" tag. Each card has the name, a big price with \"/mo\", a billing line and three features with check marks.",
    ),
    beats: [
      t("Each price digit is a vertical column of 0–9 plus an empty slot (for prices with fewer digits) inside an overflow-hidden box one line tall. Give the line a whole-pixel height and move the column by y = digit × that height in px (not yPercent), so no digit stops half a pixel off its neighbors."),
      t("At 0.9 s the thumb gets a quick press (scale 0.94, yoyo); at 1.0 s it slides to Yearly (xPercent 100, 0.45 s, power3.inOut) and the label colors swap."),
      t("At 1.1 s every digit column rolls to the yearly price together (0.7 s, power3.inOut), the billing line cross-fades, and at 1.35 s the discount badge pops in (scale 0.6 → 1, back.out(2.4))."),
      t("At 4.2 s the same moves run back to Monthly, so the loop starts and ends on the same frame; pause 1.2 s."),
    ],
    adapt: [
      t("the plans: names, monthly and yearly price per month, features, and which one is highlighted"),
      t("the currency symbol, the period text and the discount badge"),
      t("the accent color"),
    ],
    extra: [t("Prices are whole numbers so the odometer only rolls digits; give the price an aria-label, since the columns are hidden from screen readers.")],
  },
  "offer-countdown": {
    technique: "gsap",
    look: t(
      "A dark card: a small label with a pulsing colored dot, the line \"Ends in\", a flip clock with hours, minutes and seconds (two dark tiles per group, colons between groups, small labels below), and a stock line with a thin progress bar.",
    ),
    beats: [
      t("The time is real: compute the deadline once in the browser (never during server render) and check it every 250 ms; when a digit changes, flip only that tile."),
      t("Each tile has four halves: static top (new digit), static bottom (old digit), a top flap (old digit) that falls to rotationX -90 in 0.22 s (power2.in), and a bottom flap (new digit) that comes from rotationX 90 to 0 in 0.26 s (power2.out); then all halves show the new digit. Use perspective on the tile and backface-visibility hidden."),
      t("On mount the tiles rise in (y 12 → 0, stagger 0.05 s) and the stock bar fills to stock ÷ total (0.9 s, power3.out). Every 2.6 s a light streak crosses the bar and the dot pulses."),
      t("At zero the timer stops, the \"Ends in\" line is replaced by \"This offer has ended\" and the stock line dims."),
    ],
    adapt: [
      t("the real end date and time of the offer (and the time zone)"),
      t("the real stock left and the starting stock, or whether to hide the stock line"),
      t("the texts and the accent color"),
    ],
    extra: [
      t("Never fake urgency: no timer that restarts on reload and no stock that drops on its own. If the offer has no real deadline, do not use this component."),
      t("This one is not a looping timeline: the clock runs on real time and stops at zero; clear the interval on unmount."),
    ],
  },
  "review-card": {
    technique: "gsap",
    look: t(
      "A white review card: a small heading, a big average rating next to five stars and the review count, a divider, then one review with a round initial avatar, the name, when it was written and the text.",
    ),
    beats: [
      t("At 0.2 s the card rises in (y 14 → 0, 0.5 s, power3.out)."),
      t("At 0.5 s the stars pop one by one (scale 0 → 1, back.out(2.6), stagger 0.09 s) and their color fills from the left; the last star fills only by the decimal (4.9 → 90%). At the same time the rating counts from 0 to 4.9 and the review count from 0 to 312 in 1.2 s, formatted with Intl.NumberFormat."),
      t("From 1.5 s each review takes 3.4 s: its words come in one after another (autoAlpha, y 8 → 0, blur 4px → 0, stagger 0.035 s), then it fades up and out 0.35 s before the next. The last review stays."),
    ],
    adapt: [
      t("the real rating, the real review count and real reviews (name, text, when)"),
      t("the heading and the language of the numbers"),
      t("the star color"),
    ],
    extra: [
      t("Stack all the reviews in the same grid cell so the card keeps the height of the longest one and nothing jumps."),
      t("Use only real reviews, with permission. Do not copy the logo of a review platform."),
    ],
  },
  "order-tracker": {
    technique: "gsap",
    look: t(
      "A white card: on top a small light map with blocks, a gray road from a store dot to a home pin and a round courier marker; below it the order number, \"Arrives in 12 min\" and four stages in a vertical list (round markers joined by a line, stage name and time).",
    ),
    beats: [
      t("Stages check off at 0.3 s, 1.3 s, 2.3 s and 5.9 s: the marker fills with color (scale 0 → 1, back.out(2.4)), the check draws itself (stroke-dashoffset to 0) and the label goes from 55% to full opacity. Between them the vertical line grows a third at a time (scaleY, 0.5 s)."),
      t("From 2.5 s to 5.5 s the courier follows the road with MotionPathPlugin (align to the path, power1.inOut), the colored route draws behind it (stroke-dashoffset) and the minutes count down from 12 to 0."),
      t("At 5.9 s \"Arrives in\" is replaced by \"Delivered\" (back.out(1.8)) and eight small confetti pieces burst from it to fixed offsets, then fall a little and fade by 7.3 s."),
    ],
    adapt: [
      t("the four stages and their times (it can also show a service process, not only a delivery)"),
      t("the order label, the minutes and the texts"),
      t("the accent color"),
    ],
    extra: [t("Register MotionPathPlugin with gsap.registerPlugin. Confetti offsets are a fixed list, not random, so every loop looks the same.")],
  },
  "sales-funnel": {
    technique: "anatomy",
    look: t(
      "An isometric machine that works as a sales funnel: a hopper on top, three sloped trays one below the other, a small box under each tray, and a lit bin with a counter at the end.",
    ),
    beats: [
      t("Balls (people) drop from the hopper onto the first tray, a few per second."),
      t("On each tray a ball either rolls on to the next tray or falls through a notch into the box below. Chances to move on: 30% (clicked), 35% (called), 40% (booked)."),
      t("Balls that pass all three trays light up and land in the bin; its counter goes up. A readout under the figure says \"N came in → a → b → c booked\"."),
      t("Moving the pointer left or right (or the arrow keys) changes how many balls come in per second, like changing the ad budget. With no input, the rate drifts slowly on its own."),
    ],
    adapt: [
      t("the names of the three stages and the chance of moving on at each one"),
      t("the theme (dark or light) and the accent color of the lit balls and bin"),
    ],
    extra: [
      t("Follow the anatomy skill's workflow: build the static figure with its kit (solids, trays, boxes, screws, rulers), then animate only the balls and the counter on top of it."),
      t("Use a seeded random so the same film plays every time; stop the loop when the figure is offscreen; with reduced motion show one still frame with the totals for 1,000 people."),
      t("In React, inject the SVG once with a constant object (not a new { __html } on every render), or the balls get drawn into a detached copy."),
    ],
  },
  "roi-balance": {
    technique: "anatomy",
    look: t(
      "An isometric bench balance: a base plate on feet, a column with a pivot yoke, an equal-arm beam, two pans hanging on three rods each, stacked weights on the pans, a pointer swinging over a small fan-shaped scale on the column, and a counter box that shows the return.",
    ),
    beats: [
      t("Left pan: the monthly ad budget, one weight per 2,000. Right pan: the revenue it brought in, in lit weights."),
      t("The model (example numbers): each click costs more as the budget grows, CPC = 1 × (1 + budget/3,000)^0.6; 3% of clicks buy at 150 each; revenue = clicks × 3% × 150; ROAS = revenue / budget (about 4.1× at 500, 2.7× at 4,000, 1.3× at 20,000)."),
      t("The beam tilts toward the heavier pan by 30° × (ROAS − 1)/(ROAS + 1): level means break-even. It moves on a damped spring, so it overshoots a little and settles. The pans stay level and follow the beam ends."),
      t("The pointer hangs from the pivot and reads the return on the scale, with a stronger mark at 1×. The counter and a readout under the figure say \"Budget → revenue · ROAS\"."),
      t("Moving the pointer left or right (or the arrow keys) sets the budget on a log scale from 500 to 20,000; with no input it drifts slowly on its own."),
    ],
    adapt: [
      t("the conversion rate, the average order value and the currency"),
      t("the budget range"),
      t("the theme (dark or light) and the accent color of the revenue weights and the pointer"),
    ],
    extra: [
      t("Follow the anatomy skill's workflow: draw every static part with its kit, keep the model in one place, and let the readout come from the same numbers that move the beam."),
      t("A rotation can't be a screen transform: redraw the beam each frame as a box rotated about the pivot (visible faces by depth, outline by the convex hull), and move the pans with translateAlong."),
      t("Only one part is lit: the revenue weights (and the pointer). Stop the loop when offscreen; with reduced motion, jump straight to the resting tilt."),
    ],
  },
  "page-speed-gauge": {
    technique: "anatomy",
    look: t(
      "An isometric bench rig: a stack of plates on a load cell (the page weight), wired to a round bench stopwatch with a 0–10 s dial; a conveyor belt carries small visitor figures toward a door frame (the website); a pneumatic pusher behind the belt and a tray in front of it.",
    ),
    beats: [
      t("One plate per MB on the load cell. Load time = 0.6 s + MB ÷ connection speed (1 MB/s by default); the stopwatch needle (the lit part) shows it."),
      t("Visitors ride the belt toward the door, one every 0.55 s. Each one decides at the start whether it will leave, with the bounce chance for the current load time."),
      t("Bounce follows Google's published curve (Think with Google, 2017), starting from 20% at 1 s: 1→3 s +32%, 1→5 s +90%, 1→6 s +106%, 1→10 s +123%, interpolated in between."),
      t("At the pusher, a visitor who leaves stops, the ram plate shoots across the belt, the visitor slides off the front edge, drops into the tray and fades. The others go through the door and fade. A readout says \"MB · loads in s · % leave\"."),
      t("Moving the pointer left or right (or the arrow keys) sets the page weight from 0.5 to 8 MB; with no input it drifts slowly on its own."),
    ],
    adapt: [
      t("the bounce rate at 1 s and the connection speed"),
      t("the page weight range"),
      t("the theme (dark or light) and the accent color of the needle"),
    ],
    extra: [
      t("Follow the anatomy skill's workflow: draw every static part with its kit, draw one visitor once and clone it, and move clones, the ram and the plates with translateAlong; sort the visitors by depth every frame."),
      t("Paint order: back door post before the visitors, front belt rail, front post and lintel after them. Cite the source of the bounce curve in the caption."),
      t("Use a seeded random; stop the loop when offscreen; with reduced motion show one still frame with a few visitors on the belt and one in the tray."),
    ],
  },
  "langendorff-heart": {
    technique: "anatomy",
    look: t(
      "An isometric Langendorff rig on a bench plate: a ring stand with clamps holds a water-jacketed glass heating coil and a bubble trap with a dial gauge on top; below it a steel cannula is tied into the aorta of an isolated human heart that hangs and beats. On the plate: a flask of blue buffer with a gas bubbler, a peristaltic pump with three rollers and an rpm display, a funnel catching the effluent from the apex, a paper chart recorder with a pen arm, and a small stimulator wired to the cannula.",
    ),
    beats: [
      t("The heart is real anatomy (ventricles, atria and auricles, cut aorta, pulmonary trunk, venae cavae and pulmonary veins, coronary arteries in their grooves, epicardial fat), ray-marched in WebGL as a signed distance field in the same isometric camera, and shaded in the kit's own five tones with one outline, so it looks like the other parts. Only the vessels are blue."),
      t("Each beat: the atria contract 0.16 s before the ventricles (9% smaller); then the ventricles shorten 8% toward the base, twist about 10° at the apex and relax with a 45 ms time constant."),
      t("The model (adult human heart, 310 g): perfusion pressure held at 70 mmHg; LV balloon pressure from 8 mmHg (end-diastolic) to 8 + 102 mmHg at 72 bpm, rising about 12% toward 150 bpm (Bowditch effect); systole 0.3 s × sqrt(60/bpm); coronary flow 250 mL/min at 72 bpm, scaled by (bpm × developed pressure)^0.7."),
      t("The pump turns at flow ÷ 2.5 mL per turn (about 100 rpm at 72 bpm), the gauge needle sits at 70 mmHg with a small ripple from the rollers, the chart pen traces the LV pressure on paper moving at 10 mm/s, bubbles rise in the flask, and a thin stream runs off the apex, thicker in systole, narrowing as it falls."),
      t("Moving the pointer left or right (or the arrow keys) sets the heart rate from 50 to 150 bpm; with no input it tours between rest, faster and slower. A readout says \"bpm · LV systolic/diastolic · coronary flow\"."),
    ],
    adapt: [
      t("the resting heart rate"),
      t("the theme (dark or light): the heart reads its tones from the same CSS variables as the rest of the figure"),
      t("the accent color of the buffer, the tubes and the coronary vessels"),
    ],
    extra: [
      t("Follow the anatomy skill's WebGL rules: back SVG, canvas, front SVG in one stage with the same viewBox; the canvas only draws the heart; the tie collar on the aorta and the effluent stream go in the front SVG."),
      t("Write the anatomy once as a list of primitives and generate both the GLSL and a JS evaluator from it, so the coronary paths can be found on the surface (the groove where the two ventricles meet) at build time."),
      t("Without a real GPU (software WebGL), skip the shader and show a simple SVG heart; stop the loop when offscreen; with reduced motion show one still frame in systole."),
    ],
  },
};

export const techniqueOf = (slug: string): Technique => RECIPES[slug]?.technique ?? "gsap";
export const hasPrompt = (slug: string) => slug in RECIPES;

// Cuidados que valem para todo componente em GSAP.
const GSAP_RULES: Text[] = [
  t("Use one GSAP timeline that loops forever with a short pause between runs (repeat: -1). If the step by step gives the pause, use that value; otherwise repeatDelay about 1.4 s."),
  t("Set every starting state with set() at the start of the timeline, never with from(): on the second loop from() starts from the wrong place."),
  t(
    "Elements that appear later and would push the layout (new chat bubbles, new rows) stay display:none until their turn; elements that already have their place in the layout (a subtitle, a button) start hidden with autoAlpha 0, so nothing jumps.",
  ),
  t("If there is a cursor or pointer, it aims at the measured center of its target (getBoundingClientRect), never at fixed pixel coordinates; if the component is scaled, divide by the scale."),
  t("Blur only in the middle of a movement and always end at blur(0)."),
  t("With prefers-reduced-motion, jump to the final frame and stop (tl.progress(1).pause())."),
  t("In React, use useGSAP from @gsap/react with a scope ref, so the timeline is cleaned up on unmount."),
  t("All example content stays generic (no real brands, logos or people)."),
];

const VIDEO: Record<Agent, Text> = {
  claude: t(
    `If I also want this as an MP4 (ads, stories, WhatsApp status), install the HyperFrames plugin with \`${SKILLS.hyperframes.claude[0]}\` and \`${SKILLS.hyperframes.claude[1]}\`, then use /hyperframes:hyperframes to render the same animation in 9:16, 1:1 or 16:9. Rendering needs FFmpeg installed, or render with --docker (downloads about 3.3 GB the first time). Ask me before installing.`,
  ),
  other: t(
    `If I also want this as an MP4 (ads, stories, WhatsApp status), install the HyperFrames skills with \`${SKILLS.hyperframes.other}\` (choose your agent) and render the same animation in 9:16, 1:1 or 16:9. Rendering needs FFmpeg installed, or render with --docker (downloads about 3.3 GB the first time). Ask me before installing.`,
  ),
};

function toolsStep(technique: Technique, agent: Agent): string {
  const s = SKILLS[technique];
  if (agent === "claude") {
    return technique === "gsap"
      ? `Check whether the official GSAP skills are installed (gsap-core, gsap-timeline, gsap-react). If they are not, ask me and then run \`${s.claude}\` (choose Claude Code). If they do not show up in this session yet, read the SKILL.md files the installer created for gsap-timeline and gsap-react before writing code.`
      : `Check whether the anatomy skill is installed. If it is not, ask me and then run \`${s.claude}\`. It needs Node 20.10+ and Chrome for its checks. If it does not show up in this session yet, read its SKILL.md (in ~/.claude/skills/anatomy) before starting.`;
  }
  // Agentes que cada instalador atende, segundo o README de cada repositório.
  const agents = technique === "gsap" ? "codex, opencode, antigravity" : "codex, opencode, antigravity, minimax-code";
  return `These instructions were written for Claude Code, which uses "skills" (folders with a SKILL.md that teach it a technique). First find out how you load skills, rules or instructions, and get the same knowledge: (a) if your agent is supported by the skills installer, ask me and run \`${s.other}\` (for example ${agents}); (b) otherwise copy the skill folders from ${s.repo} into your skills or rules directory${technique === "gsap" ? " (in Cursor: Settings → Rules → Remote Rule (GitHub) → greensock/gsap-skills)" : ""}; (c) if you cannot load skills at all, open the SKILL.md files in ${s.repo} and read them as instructions before coding. Tell me which path you used.`;
}

const L = {
  en: {
    intro: (name: string, site: string) => `Recreate the "${name}" animated component from Motionshelf (${site}) in my current project, adapted to my brand. Answer me in the language I write to you in. Work in this order:`,
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
    `1. ${l.tools}: ${toolsStep(r.technique, agent)}`,
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
