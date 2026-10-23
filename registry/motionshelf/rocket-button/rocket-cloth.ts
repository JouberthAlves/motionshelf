// Pano do paraquedas do Rocket Launch: um tecido 3D em Verlet (x para a direita, y para baixo, z para o
// espectador, px de tela) desenhado num canvas 2D. A malha é polar, como um paraquedas redondo de verdade:
// um ponto no ápice e 9 anéis de 24 pontos. A forma inicial é o domo inflado, e o domo é o tamanho real do
// tecido: quando ele murcha sobra pano, e é isso que faz as dobras.
//
// Quando o foguete pousa, o domo é solto na mesma forma do SVG, cai com gravidade e arrasto do ar, cobre o
// botão e os propulsores e escorrega até o chão. Depois de um instante uma rajada vinda da esquerda arranca o
// pano, que cai amassado no chão, à direita da plataforma, e fica parado (simulação dormindo). No próximo
// lançamento o jato dos motores sopra o pano para fora da tela.
//
// O desenho ordena os triângulos de trás para a frente e pinta cada um com a cor do gomo, iluminada nos dois
// lados (o lado de dentro é mais escuro). Sem alocação no laço quente: tudo em Float32Array já criado.

export type ClothBody = {
  /** chão (topo da plataforma) em px de tela, y para baixo */
  ground: number;
  /** caixa do botão em px de tela; profundidade em z de -depth a +depth */
  button: { x0: number; x1: number; y0: number; depth: number };
  /** propulsores: cilindros verticais do topo até o chão, com ponta arredondada */
  boosters: { x: number; r: number; top: number }[];
};

export type Cloth = {
  /** Solta o paraquedas aberto: aro em (cx, rimY), raios rx (largura) e ry (altura do domo), descendo a vy px/s. */
  drop: (cx: number, rimY: number, rx: number, ry: number, vy: number) => void;
  /** Avança dt s. blast: centro do jato no chão e força 0–1 (null sem motor). */
  step: (dt: number, body: ClothBody, blast: { x: number; power: number } | null) => void;
  /** true enquanto ainda se mexe (o laço do botão não pode parar). */
  awake: () => boolean;
  resize: (width: number, height: number) => void;
  clear: () => void;
};

const RINGS = 12;
const SECTORS = 30; // 10 gomos de 3 setores, como os 5 da frente no SVG
const COUNT = 1 + RINGS * SECTORS;

// Física
const STEP = 1 / 120; // passo fixo, s
const MAX_STEPS = 4; // por quadro
const ITERATIONS = 10;
const GRAVITY = 900; // px/s²
const DAMPING = 0.992; // da velocidade, por passo
const DRAG = 0.03; // arrasto do ar por triângulo
const MAX_MOVE = 40; // deslocamento máximo por passo, px
const SHEAR = 0.8;
// O pano é maior que o domo: ao murchar ele se abre até GROW a mais, em GROW_TIME s, e alcança os propulsores.
const GROW = 0.55;
const GROW_TIME = 0.5;
const BEND = 0.15; // dobrar custa pouco, e só resiste a esticar
const COMPRESS = 0.2; // quanto o pano resiste a encolher, perto de esticar (1)
const MARGIN = 1.5; // folga entre o pano e as peças, px
const CONTACT = 2.5; // até aqui da folga ainda conta como encostado (atrito e sombra)
// Atrito: fração da velocidade tangencial perdida por passo em contato.
const FRICTION_BODY = 0.04;
const FRICTION_GROUND = 0.12;
const FRICTION_BLOWN = 0.01; // com o jato soprando por baixo o pano quase não arrasta no chão

// Tempos, s
const SETTLE_SPEED = 8; // px/s: abaixo disso o pano está assentado
const REST_TIME = 1.2; // descansa assim que assenta, antes da rajada
const REST_MAX = 2.6; // ou, no máximo, até aqui depois do toque
const GUST_RAMP = 0.25;
const GUST_TIME = 0.9;
const GUST_FADE = 0.15;
const GUST_PUSH = 1100; // px/s² para +x
const GUST_MAX = 3; // s: a rajada segura no máximo enquanto o pano ainda cobre o foguete
const GUST_LIFT = 700; // px/s² para cima, no máximo
const LYING_SPEED = 6;
const LYING_TIME = 0.5;
const LYING_MAX = 5;
const BLAST_PUSH = 2600; // px/s²
const BLAST_RANGE = 300; // px: além disso o jato não alcança
const BLAST_LIFT = 0.6;
const BLAST_SAFETY = 4; // se depois disso ainda houver pano na tela, some com ele
const FADE_TIME = 0.6;
const CORD_TIME = 0.35;

const Mode = {
  Sleep: 0,
  Fall: 1, // caindo e descansando sobre o botão
  Gust: 2,
  Lying: 3, // rajada acabou, assentando no chão
  Blown: 4,
} as const;
type ModeValue = (typeof Mode)[keyof typeof Mode];

// Cores dos gomos (iguais às do SVG) multiplicadas pela luz, em 64 níveis.
const LEVELS = 64;
const GORES: [number, number, number][] = [
  [31, 91, 255],
  [238, 242, 255],
];
const COLORS = GORES.map((g) =>
  Array.from({ length: LEVELS }, (_, i) => {
    const l = i / (LEVELS - 1);
    return `rgb(${Math.round(g[0] * l)},${Math.round(g[1] * l)},${Math.round(g[2] * l)})`;
  }),
);
// Luz vinda de cima, da esquerda e da frente (unitária).
const LIGHT_LEN = Math.hypot(-0.4, -0.8, 0.45);
const LX = -0.4 / LIGHT_LEN;
const LY = -0.8 / LIGHT_LEN;
const LZ = 0.45 / LIGHT_LEN;
const HALF_LEN = Math.hypot(LX, LY, LZ + 1);
const HX = LX / HALF_LEN;
const HY = LY / HALF_LEN;
const HZ = (LZ + 1) / HALF_LEN;

// Pontos do aro na frente (z > 0) onde as cordas estavam presas: 165°, 120°, 60° e 15°.
const RIMS = [165, 120, 60, 15].map((deg) => Math.round((deg / 360) * SECTORS));
// Ao soltar as cordas o domo murcha: o topo cai mais rápido que o aro, e o aro se abre um pouco.
const DEFLATE_FALL = 60; // px/s a mais no topo
const DEFLATE_SPREAD = 30; // px/s para fora, no aro
// Brilho de náilon: reflexo fraco e largo.
const SHEEN = 0.16;

const ring = (k: number, j: number) => (k === 0 ? 0 : 1 + (k - 1) * SECTORS + ((j + SECTORS) % SECTORS));

/** Malha fixa: restrições de distância e triângulos (a ordem dos vértices dá a normal para fora do domo). */
function buildMesh() {
  const a: number[] = [];
  const b: number[] = [];
  const k: number[] = [];
  const one: number[] = [];
  const link = (i: number, j: number, stiff: number, oneSided: number) => {
    a.push(i);
    b.push(j);
    k.push(stiff);
    one.push(oneSided);
  };
  for (let j = 0; j < SECTORS; j++) link(0, ring(1, j), 1, 0);
  for (let r = 1; r <= RINGS; r++) {
    for (let j = 0; j < SECTORS; j++) {
      link(ring(r, j), ring(r, j + 1), 1, 0);
      if (r < RINGS) {
        link(ring(r, j), ring(r + 1, j), 1, 0);
        link(ring(r, j), ring(r + 1, j + 1), SHEAR, 0);
        link(ring(r, j + 1), ring(r + 1, j), SHEAR, 0);
      }
    }
  }
  // Dobra: pula um ponto, radial e circunferencial.
  for (let j = 0; j < SECTORS; j++) {
    link(0, ring(2, j), BEND, 1);
    for (let r = 1; r <= RINGS - 2; r++) link(ring(r, j), ring(r + 2, j), BEND, 1);
    for (let r = 1; r <= RINGS; r++) link(ring(r, j), ring(r, j + 2), BEND, 1);
  }
  const ta: number[] = [];
  const tb: number[] = [];
  const tc: number[] = [];
  const tg: number[] = [];
  const tri = (i: number, j: number, l: number, gore: number) => {
    ta.push(i);
    tb.push(j);
    tc.push(l);
    tg.push(gore);
  };
  for (let j = 0; j < SECTORS; j++) {
    const gore = Math.floor(j / 3) & 1;
    tri(0, ring(1, j), ring(1, j + 1), gore);
    for (let r = 1; r < RINGS; r++) {
      tri(ring(r, j), ring(r + 1, j), ring(r, j + 1), gore);
      tri(ring(r + 1, j), ring(r + 1, j + 1), ring(r, j + 1), gore);
    }
  }
  return {
    ca: Uint16Array.from(a),
    cb: Uint16Array.from(b),
    ck: Float32Array.from(k),
    cone: Uint8Array.from(one),
    ta: Uint16Array.from(ta),
    tb: Uint16Array.from(tb),
    tc: Uint16Array.from(tc),
    tg: Uint8Array.from(tg),
  };
}

export function createCloth(canvas: HTMLCanvasElement): Cloth {
  const ctx = canvas.getContext("2d")!;
  const { ca, cb, ck, cone, ta, tb, tc, tg } = buildMesh();
  const NC = ca.length;
  const NT = ta.length;
  const P = new Float32Array(COUNT * 3); // posição
  const Q = new Float32Array(COUNT * 3); // posição anterior
  const N = new Float32Array(COUNT * 3); // normal suave de cada ponto (só no desenho)
  const F = new Float32Array(COUNT * 3); // aceleração
  const rest = new Float32Array(NC);
  const jitter = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) jitter[i] = Math.random() * 2 - 1;
  const hit = new Uint8Array(COUNT); // empurrado por uma peça neste passo
  const touch = new Uint8Array(COUNT); // encostado (para a sombra)
  const tz = new Float32Array(NT);
  const order = new Uint16Array(NT);
  for (let t = 0; t < NT; t++) order[t] = t;
  const byDepth = (i: number, j: number) => tz[i] - tz[j];

  let width = 1;
  let height = 1;
  let present = false;
  let mode: ModeValue = Mode.Sleep;
  let body: ClothBody | null = null;
  let acc = 0;
  let age = 0; // desde o toque
  let settled = 0;
  let gustT = 0;
  let lying = 0;
  let calm = 0;
  let blastT = -1;
  let fade = 0;
  let speed = 0; // maior velocidade de um ponto, px/s
  // Estado do passo atual
  let gust = 0;
  let grow = 1; // fator no comprimento das restrições
  let blastX = 0;
  let blastPower = 0;

  /** Depois de empurrar um ponto para fora de uma peça: tira a velocidade para dentro e aplica o atrito. */
  const contact = (i: number, nx: number, ny: number, nz: number, friction: number, pen: number) => {
    touch[i] = 1;
    const o = i * 3;
    let vx = P[o] - Q[o];
    let vy = P[o + 1] - Q[o + 1];
    let vz = P[o + 2] - Q[o + 2];
    const vn = vx * nx + vy * ny + vz * nz;
    const keep = hit[i] || pen > 0 ? 0 : vn;
    const k = 1 - friction;
    vx = (vx - vn * nx) * k + keep * nx;
    vy = (vy - vn * ny) * k + keep * ny;
    vz = (vz - vn * nz) * k + keep * nz;
    Q[o] = P[o] - vx;
    Q[o + 1] = P[o + 1] - vy;
    Q[o + 2] = P[o + 2] - vz;
  };

  /** Colisão do ponto i com o chão, o botão e os propulsores. fin: passada final, com atrito. */
  const collide = (b: ClothBody, i: number, fin: boolean) => {
    const o = i * 3;
    const lim = fin ? -CONTACT : 0;
    // chão
    let pen = P[o + 1] - (b.ground - MARGIN);
    if (pen > lim) {
      if (pen > 0) P[o + 1] -= pen;
      if (fin) contact(i, 0, -1, 0, blastT >= 0 ? FRICTION_BLOWN : FRICTION_GROUND, pen);
      else hit[i] = 1;
    }
    // botão: caixa, sai pelo lado de menor penetração
    const bt = b.button;
    const x = P[o];
    const y = P[o + 1];
    const z = P[o + 2];
    const pTop = y - (bt.y0 - MARGIN);
    const pLeft = x - (bt.x0 - MARGIN);
    const pRight = bt.x1 + MARGIN - x;
    const pFront = bt.depth + MARGIN - z;
    const pBack = z + bt.depth + MARGIN;
    pen = Math.min(pTop, pLeft, pRight, pFront, pBack);
    if (pen > lim) {
      let nx = 0;
      let ny = 0;
      let nz = 0;
      if (pen === pTop) ny = -1;
      else if (pen === pLeft) nx = -1;
      else if (pen === pRight) nx = 1;
      else if (pen === pFront) nz = 1;
      else nz = -1;
      if (pen > 0) {
        P[o] += nx * pen;
        P[o + 1] += ny * pen;
        P[o + 2] += nz * pen;
      }
      if (fin) contact(i, nx, ny, nz, FRICTION_BODY, pen);
      else hit[i] = 1;
    }
    // propulsores: cilindro até a ponta, esfera na ponta
    for (let n = 0; n < b.boosters.length; n++) {
      const bo = b.boosters[n];
      const px = P[o] - bo.x;
      const py = P[o + 1] - (bo.top + bo.r);
      const pz = P[o + 2];
      const round = py < 0; // acima do centro da esfera
      const d = Math.sqrt(px * px + (round ? py * py : 0) + pz * pz);
      pen = bo.r + MARGIN - d;
      if (pen > lim) {
        const inv = d > 1e-6 ? 1 / d : 0;
        const nx = d > 1e-6 ? px * inv : 1;
        const ny = round && d > 1e-6 ? py * inv : 0;
        const nz = pz * inv;
        if (pen > 0) {
          P[o] += nx * pen;
          P[o + 1] += ny * pen;
          P[o + 2] += nz * pen;
        }
        if (fin) contact(i, nx, ny, nz, FRICTION_BODY, pen);
        else hit[i] = 1;
      }
    }
  };

  const substep = (b: ClothBody) => {
    const groundY = b.ground;
    const height0 = Math.max(1, b.ground - b.button.y0);
    // forças (aceleração, massa 1)
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      F[o] = 0;
      F[o + 1] = GRAVITY;
      F[o + 2] = 0;
    }
    // arrasto do ar: contra a velocidade do triângulo na direção da normal
    for (let t = 0; t < NT; t++) {
      const a = ta[t] * 3;
      const bb = tb[t] * 3;
      const c = tc[t] * 3;
      const ux = P[bb] - P[a];
      const uy = P[bb + 1] - P[a + 1];
      const uz = P[bb + 2] - P[a + 2];
      const wx = P[c] - P[a];
      const wy = P[c + 1] - P[a + 1];
      const wz = P[c + 2] - P[a + 2];
      let nx = uy * wz - uz * wy;
      let ny = uz * wx - ux * wz;
      let nz = ux * wy - uy * wx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len < 1e-4) continue;
      nx /= len;
      ny /= len;
      nz /= len;
      const k = 1 / (3 * STEP);
      const vx = (P[a] - Q[a] + P[bb] - Q[bb] + P[c] - Q[c]) * k;
      const vy = (P[a + 1] - Q[a + 1] + P[bb + 1] - Q[bb + 1] + P[c + 1] - Q[c + 1]) * k;
      const vz = (P[a + 2] - Q[a + 2] + P[bb + 2] - Q[bb + 2] + P[c + 2] - Q[c + 2]) * k;
      const f = (-DRAG * (vx * nx + vy * ny + vz * nz) * len * 0.5) / 3;
      F[a] += nx * f;
      F[a + 1] += ny * f;
      F[a + 2] += nz * f;
      F[bb] += nx * f;
      F[bb + 1] += ny * f;
      F[bb + 2] += nz * f;
      F[c] += nx * f;
      F[c + 1] += ny * f;
      F[c + 2] += nz * f;
    }
    // rajada: empurra para +x e levanta mais quem está no alto
    if (gust > 0) {
      for (let i = 0; i < COUNT; i++) {
        const o = i * 3;
        const high = Math.min(1, Math.max(0, (groundY - P[o + 1]) / height0));
        F[o] += GUST_PUSH * gust;
        F[o + 1] -= GUST_LIFT * gust * high;
      }
    }
    // jato dos motores: para longe do centro da plataforma, forte perto e nulo além de BLAST_RANGE
    if (blastPower > 0) {
      for (let i = 0; i < COUNT; i++) {
        const o = i * 3;
        const dx = P[o] - blastX;
        const dy = P[o + 1] - groundY;
        const fall = 1 - (dx * dx + dy * dy) / (BLAST_RANGE * BLAST_RANGE);
        if (fall <= 0) continue;
        const a = BLAST_PUSH * blastPower * fall;
        const sx = dx + 40;
        F[o] += (a * sx) / Math.sqrt(sx * sx + 900);
        F[o + 1] -= a * BLAST_LIFT;
        F[o + 2] += a * 0.3 * jitter[i];
      }
    }
    // integração
    const h2 = STEP * STEP;
    const max2 = MAX_MOVE * MAX_MOVE;
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      let dx = (P[o] - Q[o]) * DAMPING + F[o] * h2;
      let dy = (P[o + 1] - Q[o + 1]) * DAMPING + F[o + 1] * h2;
      let dz = (P[o + 2] - Q[o + 2]) * DAMPING + F[o + 2] * h2;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > max2) {
        const s = MAX_MOVE / Math.sqrt(d2);
        dx *= s;
        dy *= s;
        dz *= s;
      }
      Q[o] = P[o];
      Q[o + 1] = P[o + 1];
      Q[o + 2] = P[o + 2];
      P[o] += dx;
      P[o + 1] += dy;
      P[o + 2] += dz;
    }
    // restrições e colisões
    hit.fill(0);
    touch.fill(0);
    for (let it = 0; it < ITERATIONS; it++) {
      const back = it & 1;
      for (let n = 0; n < NC; n++) {
        const c = back ? NC - 1 - n : n;
        const a = ca[c] * 3;
        const bb = cb[c] * 3;
        const dx = P[bb] - P[a];
        const dy = P[bb + 1] - P[a + 1];
        const dz = P[bb + 2] - P[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1e-6) continue;
        const r = rest[c] * grow;
        if (cone[c] && d < r) continue;
        // Tecido de verdade quase não estica, mas encolhe à toa (enruga em dobras finas): comprimir custa pouco.
        const s = ((d - r) / d) * 0.5 * ck[c] * (d < r ? COMPRESS : 1);
        P[a] += dx * s;
        P[a + 1] += dy * s;
        P[a + 2] += dz * s;
        P[bb] -= dx * s;
        P[bb + 1] -= dy * s;
        P[bb + 2] -= dz * s;
      }
      for (let i = 0; i < COUNT; i++) collide(b, i, false);
    }
    for (let i = 0; i < COUNT; i++) collide(b, i, true);
    // maior velocidade que sobrou
    let m = 0;
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      const dx = P[o] - Q[o];
      const dy = P[o + 1] - Q[o + 1];
      const dz = P[o + 2] - Q[o + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > m) m = d2;
    }
    speed = Math.sqrt(m) / STEP;
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    if (!present) return;
    // cordas soltas: somem logo depois do toque
    if (body && age < CORD_TIME) {
      const bt = body.button;
      const w = bt.x1 - bt.x0;
      const ends = [bt.x0, bt.x0 + w * 0.3, bt.x1 - w * 0.3, bt.x1];
      const rims = RIMS;
      ctx.globalAlpha = 0.7 * (1 - age / CORD_TIME);
      ctx.strokeStyle = "#c9d2ea";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let n = 0; n < 4; n++) {
        const o = ring(RINGS, rims[n]) * 3;
        ctx.moveTo(P[o], P[o + 1]);
        ctx.lineTo(ends[n], bt.y0);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Normais suaves: a de cada ponto é a soma das faces em volta (pesadas pela área), para fora do domo.
    N.fill(0);
    for (let t = 0; t < NT; t++) {
      const a3 = ta[t] * 3;
      const b3 = tb[t] * 3;
      const c3 = tc[t] * 3;
      const ux = P[b3] - P[a3];
      const uy = P[b3 + 1] - P[a3 + 1];
      const uz = P[b3 + 2] - P[a3 + 2];
      const wx = P[c3] - P[a3];
      const wy = P[c3 + 1] - P[a3 + 1];
      const wz = P[c3 + 2] - P[a3 + 2];
      const nx = uy * wz - uz * wy;
      const ny = uz * wx - ux * wz;
      const nz = ux * wy - uy * wx;
      N[a3] += nx;
      N[a3 + 1] += ny;
      N[a3 + 2] += nz;
      N[b3] += nx;
      N[b3 + 1] += ny;
      N[b3 + 2] += nz;
      N[c3] += nx;
      N[c3 + 1] += ny;
      N[c3 + 2] += nz;
      tz[t] = (P[a3 + 2] + P[b3 + 2] + P[c3 + 2]) / 3;
    }
    for (let o = 0; o < COUNT * 3; o += 3) {
      const l = Math.hypot(N[o], N[o + 1], N[o + 2]) || 1;
      N[o] /= l;
      N[o + 1] /= l;
      N[o + 2] /= l;
    }
    order.sort(byDepth);
    ctx.lineWidth = 0.6;
    ctx.lineJoin = "round";
    for (let n = 0; n < NT; n++) {
      const t = order[n];
      const a = ta[t];
      const bb = tb[t];
      const c = tc[t];
      const a3 = a * 3;
      const b3 = bb * 3;
      const c3 = c * 3;
      const ux = P[b3] - P[a3];
      const uy = P[b3 + 1] - P[a3 + 1];
      const wx = P[c3] - P[a3];
      const wy = P[c3 + 1] - P[a3 + 1];
      // a face mostra o lado de fora ou o de dentro conforme vira para o espectador
      const inside = ux * wy - uy * wx < 0;
      const sgn = inside ? -1 : 1;
      let nx = (N[a3] + N[b3] + N[c3]) * sgn;
      let ny = (N[a3 + 1] + N[b3 + 1] + N[c3 + 1]) * sgn;
      let nz = (N[a3 + 2] + N[b3 + 2] + N[c3 + 2]) * sgn;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const diffuse = Math.max(0, nx * LX + ny * LY + nz * LZ);
      // reflexo: meio caminho entre a luz e o olho (0, 0, 1)
      const half = Math.max(0, nx * HX + ny * HY + nz * HZ);
      let lum = 0.4 + 0.55 * diffuse + SHEEN * half ** 12;
      if (inside) lum *= 0.82;
      if (touch[a] || touch[bb] || touch[c]) lum *= 0.85;
      const color = COLORS[tg[t]][Math.round(Math.min(1, lum) * (LEVELS - 1))];
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(P[a3], P[a3 + 1]);
      ctx.lineTo(P[b3], P[b3 + 1]);
      ctx.lineTo(P[c3], P[c3 + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  const wipe = () => {
    present = false;
    mode = Mode.Sleep;
    blastT = -1;
    fade = 0;
    canvas.style.opacity = "1";
    ctx.clearRect(0, 0, width, height);
  };

  // Algum ponto do pano ainda está fora do chão, em cima do botão ou dos propulsores?
  const covering = (b: ClothBody) => {
    let right = b.button.x1;
    for (const s of b.boosters) right = Math.max(right, s.x + s.r);
    right += 2;
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      if (P[o] < right && P[o + 1] < b.ground - 4) return true;
    }
    return false;
  };

  return {
    drop(cx, rimY, rx, ry, vy) {
      // domo inflado: meio elipsoide, o aro em rimY
      P[0] = cx;
      P[1] = rimY - ry;
      P[2] = 0;
      for (let r = 1; r <= RINGS; r++) {
        const s = r / RINGS;
        const rho = rx * Math.sin((s * Math.PI) / 2);
        const h = ry * Math.cos((s * Math.PI) / 2);
        for (let j = 0; j < SECTORS; j++) {
          const th = (j / SECTORS) * Math.PI * 2;
          const o = ring(r, j) * 3;
          P[o] = cx + rho * Math.cos(th);
          P[o + 1] = rimY - h;
          P[o + 2] = rho * Math.sin(th) * 0.9;
        }
      }
      for (let i = 0; i < COUNT; i++) {
        const o = i * 3;
        const s = i === 0 ? 0 : (Math.floor((i - 1) / SECTORS) + 1) / RINGS;
        const dx = P[o] - cx;
        const dz = P[o + 2];
        const d = Math.hypot(dx, dz) || 1;
        const out = DEFLATE_SPREAD * s * s;
        Q[o] = P[o] - (dx / d) * out * STEP;
        Q[o + 1] = P[o + 1] - (vy + DEFLATE_FALL * (1 - s)) * STEP;
        Q[o + 2] = P[o + 2] - (dz / d) * out * STEP;
      }
      for (let c = 0; c < NC; c++) {
        const a = ca[c] * 3;
        const b = cb[c] * 3;
        rest[c] = Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]);
      }
      present = true;
      mode = Mode.Fall;
      acc = 0;
      age = 0;
      settled = 0;
      gustT = 0;
      lying = 0;
      calm = 0;
      blastT = -1;
      fade = 0;
      speed = 1e3;
      canvas.style.opacity = "1";
    },
    step(dt, b, blast) {
      body = b;
      if (!present) return;
      blastPower = blast ? blast.power : 0;
      blastX = blast ? blast.x : 0;
      // o motor acendeu: a partir daqui o jato leva o pano embora
      if (blastPower > 0.05 && blastT < 0) {
        blastT = 0;
        mode = Mode.Blown;
      }
      if (mode === Mode.Sleep) return;
      age += dt;

      if (mode === Mode.Fall) {
        if (age >= REST_MAX || settled >= REST_TIME) {
          mode = Mode.Gust;
          gustT = 0;
        }
      }
      grow = 1 + GROW * Math.min(1, age / GROW_TIME);
      gust = 0;
      if (mode === Mode.Gust) {
        gust = Math.min(1, gustT / GUST_RAMP, (GUST_TIME - gustT) / GUST_FADE);
        gust = Math.max(0, gust);
      }

      acc += dt;
      for (let n = 0; n < MAX_STEPS && acc >= STEP; n++) {
        substep(b);
        acc -= STEP;
      }
      if (acc > STEP) acc = 0;

      if (mode === Mode.Fall) {
        settled = speed < SETTLE_SPEED ? settled + dt : 0;
      } else if (mode === Mode.Gust) {
        gustT += dt;
        // Enquanto ainda houver pano no alto em cima do foguete, a rajada segura no máximo (até GUST_MAX).
        if (gustT > GUST_TIME - GUST_FADE && gustT < GUST_MAX && covering(b)) gustT = GUST_TIME - GUST_FADE;
        if (gustT >= GUST_TIME) {
          mode = Mode.Lying;
          lying = 0;
          calm = 0;
        }
      } else if (mode === Mode.Lying) {
        lying += dt;
        calm = speed < LYING_SPEED ? calm + dt : 0;
        if (calm >= LYING_TIME || lying >= LYING_MAX) mode = Mode.Sleep;
      } else if (mode === Mode.Blown) {
        blastT += dt;
      }

      // fora da tela: tudo à direita (ou à esquerda) da borda e some
      if (mode !== Mode.Fall) {
        let gone = true;
        for (let i = 0; i < COUNT; i++) {
          const x = P[i * 3];
          if (x <= width + 40 && x >= -40) {
            gone = false;
            break;
          }
        }
        if (gone) {
          wipe();
          return;
        }
      }
      // garantia: 4 s depois do jato, o que sobrou na tela esmaece e some
      if (mode === Mode.Blown && blastT > BLAST_SAFETY) {
        fade += dt;
        canvas.style.opacity = String(Math.max(0, 1 - fade / FADE_TIME));
        if (fade >= FADE_TIME) {
          wipe();
          return;
        }
      }
      draw();
    },
    awake: () => present && mode !== Mode.Sleep,
    resize(w, h) {
      width = Math.max(w, 1);
      height = Math.max(h, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    },
    clear: wipe,
  };
}
