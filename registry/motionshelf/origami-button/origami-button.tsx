"use client";

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type MouseEvent } from "react";

export type OrigamiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Called on click, as the paper starts to fold. */
  onFold?: () => void;
  /** Called when the plane has landed and unfolded back into the button. */
  onReturn?: () => void;
  /** Classes for the flight area, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// O botão é uma folha de papel. No clique ela é redesenhada num canvas, dobra pelos vincos até virar um avião
// (cantos para trás, ao meio, asas para fora), voa um looping pela área e desdobra de volta no botão. Cada face
// é um polígono plano da folha com a sua própria rotação 3D; a projeção é ortográfica, então cada face vira uma
// afim exata no canvas. px e segundos, y para baixo, z para quem olha.
const FOLD = 0.6; // s: dobra
const FLY = 1.8; // s: voo
const TOTAL = 3; // s: dobra + voo + desdobra
const SAMPLES = 480; // pontos do caminho, igualmente espaçados em comprimento de arco
const DENSE = 24; // amostras por trecho do Catmull-Rom antes de reamostrar
const LAYER = 0.6; // px: a aba do canto dobrada fica atrás da folha
const BETA = (84 * Math.PI) / 180; // vinco do meio (sobra 6° de diedro nas asas)
const GAMMA = (78 * Math.PI) / 180; // vinco das asas
const VIEW = (38 * Math.PI) / 180; // quanto o "para cima" do avião inclina para a câmera: o dorso das asas aparece
const SQ = Math.SQRT1_2;
const BANK_GAIN = 70 * 0.9; // rad por (1/px) de curvatura lateral
const BANK_MAX = 0.8; // rad
const BANK_AVG = 15; // amostras da média móvel
const DEPTH = 620; // distância da câmera, só para a escala por profundidade
const FAR = 0.8; // escala no meio do voo
const TRAIL = 0.3; // s de rastro
const PAPER = "#121726";
const PAPER_BACK = "#262d44";
const PAPER_EDGE = "#2c3552";
const PAPER_INK = "#dfe7ff";

type Vec2 = [number, number];
type Vec3 = [number, number, number];
type Mat3 = number[]; // 9 valores, por linhas
type Quat = [number, number, number, number]; // w, x, y, z

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

// Vetores, matrizes 3×3 e quaternions mínimos.
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 1];
};
// Rodrigues: gira v em torno do eixo unitário k.
const rotAbout = (v: Vec3, k: Vec3, ang: number): Vec3 => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
};
const mulMV = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const fromMat3 = (m: Mat3): Quat => {
  const tr = m[0] + m[4] + m[8];
  let s: number;
  if (tr > 0) {
    s = Math.sqrt(tr + 1) * 2;
    return [s / 4, (m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s];
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    return [(m[7] - m[5]) / s, s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s];
  }
  if (m[4] > m[8]) {
    s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    return [(m[2] - m[6]) / s, (m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s];
  }
  s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
  return [(m[3] - m[1]) / s, (m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4];
};
const toMat3 = (q: Quat): Mat3 => {
  const [w, x, y, z] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
};
const slerp = (a: Quat, b: Quat, t: number): Quat => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sg = d < 0 ? -1 : 1;
  d *= sg;
  let ka = 1 - t;
  let kb = t;
  if (d < 0.9995) {
    const th = Math.acos(d);
    const sn = Math.sin(th);
    ka = Math.sin((1 - t) * th) / sn;
    kb = Math.sin(t * th) / sn;
  }
  const o: Quat = [
    a[0] * ka + b[0] * kb * sg,
    a[1] * ka + b[1] * kb * sg,
    a[2] * ka + b[2] * kb * sg,
    a[3] * ka + b[3] * kb * sg,
  ];
  const l = Math.hypot(o[0], o[1], o[2], o[3]) || 1;
  return [o[0] / l, o[1] / l, o[2] / l, o[3] / l];
};

const Q_ID: Quat = [1, 0, 0, 0];
const LIGHT = norm([-0.35, -0.75, 0.56]);

// Catmull-Rom centrípeto (Barry-Goldman) entre p1 e p2, u de 0 a 1.
const catmull = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, u: number): Vec3 => {
  const knot = (a: Vec3, b: Vec3, t: number) => t + Math.max(Math.sqrt(len(sub(b, a))), 1e-4);
  const t0 = 0;
  const t1 = knot(p0, p1, t0);
  const t2 = knot(p1, p2, t1);
  const t3 = knot(p2, p3, t2);
  const t = t1 + (t2 - t1) * u;
  const mix = (a: Vec3, b: Vec3, ta: number, tb: number): Vec3 => add(mul(a, (tb - t) / (tb - ta)), mul(b, (t - ta) / (tb - ta)));
  const a1 = mix(p0, p1, t0, t1);
  const a2 = mix(p1, p2, t1, t2);
  const a3 = mix(p2, p3, t2, t3);
  return mix(mix(a1, a2, t0, t2), mix(a2, a3, t1, t3), t1, t2);
};

type Flight = { pos: Vec3[]; quat: Quat[] };

// Caminho 3D do voo, do botão ao botão, com a atitude (frente, "para cima" e inclinação) em cada amostra.
const buildFlight = (ws: number, hs: number): Flight => {
  const r0 = clamp(0.2 * hs, 40, 80); // raio do looping
  const rt = clamp(0.13 * ws, 40, 70); // raio das curvas
  const home: Vec3 = [0.5 * ws, 0.64 * hs, 0];
  const entry: Vec3 = [0.7 * ws, 0.58 * hs, -60];
  const ctrl: Vec3[] = [home, [0.6 * ws, 0.61 * hs, -30], entry];
  // Looping no plano da tela: sobe pela direita, passa invertido por cima e desce pela esquerda.
  const cx = entry[0];
  const cy = entry[1] - r0;
  for (let i = 1; i <= 8; i++) {
    const phi = (i * Math.PI) / 4;
    ctrl.push([cx + r0 * Math.sin(phi) + (i === 8 ? 14 : 0), cy + r0 * Math.cos(phi), -60]);
  }
  ctrl.push([0.8 * ws, 0.57 * hs, -60]);
  // Curva da direita: meia volta no plano x–z, afastando.
  ctrl.push([0.8 * ws + rt * 0.7, 0.56 * hs, -60 - rt * 0.3]);
  ctrl.push([0.8 * ws + rt, 0.55 * hs, -60 - rt]);
  ctrl.push([0.8 * ws + rt * 0.7, 0.55 * hs, -60 - rt * 1.7]);
  ctrl.push([0.8 * ws, 0.56 * hs, -60 - 2 * rt]);
  // Travessia para a esquerda, com mergulho.
  ctrl.push([0.55 * ws, 0.7 * hs, -60 - 1.6 * rt]);
  ctrl.push([0.38 * ws, 0.74 * hs, -60 - 1.2 * rt]);
  ctrl.push([0.27 * ws, 0.66 * hs, -60 - 0.9 * rt]);
  // Curva da esquerda: semicírculo em x–z, voltando para quem olha.
  const zl = -60 - 0.9 * rt;
  const r = Math.abs(zl) / 2;
  ctrl.push([0.27 * ws - 0.7 * r, 0.64 * hs, zl / 2 - 0.7 * r]);
  ctrl.push([0.27 * ws - r, 0.63 * hs, zl / 2]);
  ctrl.push([0.27 * ws - 0.7 * r, 0.62 * hs, zl / 2 + 0.7 * r]);
  ctrl.push([0.27 * ws, 0.62 * hs, 0]);
  ctrl.push([0.4 * ws, 0.63 * hs, 0]);
  ctrl.push(home);
  // Pontos fantasma: chega e sai nivelado, para a direita.
  const pts: Vec3[] = [[home[0] - 40, home[1], 0], ...ctrl, [home[0] + 40, home[1], 0]];

  // Curva densa e reamostragem em comprimento de arco.
  const dense: Vec3[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    for (let k = 0; k < DENSE; k++) dense.push(catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], k / DENSE));
  }
  dense.push(home);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + len(sub(dense[i], dense[i - 1])));
  const total = cum[cum.length - 1];
  const pos: Vec3[] = [];
  let j = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const s = (i / (SAMPLES - 1)) * total;
    while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const seg = cum[j + 1] - cum[j];
    const f = seg > 1e-9 ? clamp((s - cum[j]) / seg, 0, 1) : 0;
    pos.push(add(dense[j], mul(sub(dense[j + 1], dense[j]), f)));
  }
  const ds = total / (SAMPLES - 1);

  // Tangentes por diferenças centrais.
  const tan: Vec3[] = pos.map((_, i) => norm(sub(pos[Math.min(i + 1, SAMPLES - 1)], pos[Math.max(i - 1, 0)])));

  // "Para cima" transportado sem torção (dupla reflexão), começando em (0, −1, 0).
  const target: Vec3 = [0, -1, 0];
  const perp = (v: Vec3, t: Vec3) => norm(sub(v, mul(t, dot(v, t))));
  const up: Vec3[] = [perp(target, tan[0])];
  for (let i = 0; i < SAMPLES - 1; i++) {
    const v1 = sub(pos[i + 1], pos[i]);
    const c1 = dot(v1, v1);
    const rl = sub(up[i], mul(v1, (2 / c1) * dot(v1, up[i])));
    const tl = sub(tan[i], mul(v1, (2 / c1) * dot(v1, tan[i])));
    const v2 = sub(tan[i + 1], tl);
    const c2 = dot(v2, v2);
    up.push(c2 > 1e-12 ? sub(rl, mul(v2, (2 / c2) * dot(v2, rl))) : rl);
  }
  // O giro que sobrou no fim é distribuído ao longo do comprimento: o pouso chega nivelado.
  const last = SAMPLES - 1;
  const tp = perp(target, tan[last]);
  const twist = Math.atan2(dot(tan[last], cross(up[last], tp)), dot(up[last], tp));
  for (let i = 0; i < SAMPLES; i++) up[i] = rotAbout(up[i], tan[i], (twist * i) / last);

  // Inclinação nas curvas: a curvatura lateral (sem a parte do looping, que é para cima) vira bank para dentro.
  const bank: Vec3[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const lo = Math.max(i - 1, 0);
    const hi = Math.min(i + 1, last);
    const kappa = mul(sub(tan[hi], tan[lo]), 1 / (ds * (hi - lo)));
    const lat = sub(sub(kappa, mul(tan[i], dot(kappa, tan[i]))), mul(up[i], dot(kappa, up[i])));
    const m = len(lat);
    bank.push(m > 1e-9 ? mul(lat, Math.min(BANK_MAX, m * BANK_GAIN) / m) : [0, 0, 0]);
  }
  const half = Math.floor(BANK_AVG / 2);
  const quat: Quat[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    let avg: Vec3 = [0, 0, 0];
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(last, i + half); k++) {
      avg = add(avg, bank[k]);
      n++;
    }
    avg = mul(avg, 1 / n);
    avg = sub(sub(avg, mul(tan[i], dot(avg, tan[i]))), mul(up[i], dot(avg, up[i])));
    const m = len(avg);
    let u = up[i];
    if (m > 1e-6) {
      const ang = Math.min(m, BANK_MAX);
      u = add(mul(up[i], Math.cos(ang)), mul(mul(avg, 1 / m), Math.sin(ang)));
    }
    // Vista: o "para cima" inclina VIEW rad para quem olha (em torno da frente), mostrando o dorso das asas
    // para qualquer lado que o avião aponte. Some quando o bico aponta para a câmera.
    const f = tan[i];
    const toCam = sub([0, 0, 1], mul(f, f[2]));
    const side = sub(toCam, mul(u, dot(toCam, u)));
    const sl = len(side);
    if (sl > 1e-4) {
      const ang = VIEW * Math.min(1, sl * 1.5);
      u = norm(add(mul(u, Math.cos(ang)), mul(side, Math.sin(ang) / sl)));
    }
    // Colunas: x do modelo → frente, −z do modelo → "para cima".
    const c1 = f;
    const c3 = mul(u, -1);
    const c2 = cross(c3, c1);
    const m3: Mat3 = [c1[0], c2[0], c3[0], c1[1], c2[1], c3[1], c1[2], c2[2], c3[2]];
    let q = fromMat3(m3);
    const prev = quat[i - 1];
    if (prev && prev[0] * q[0] + prev[1] * q[1] + prev[2] * q[2] + prev[3] * q[3] < 0) q = [-q[0], -q[1], -q[2], -q[3]];
    quat.push(q);
  }
  return { pos, quat };
};

// Fração do caminho percorrida em τ: acelera até 0,14, constante, desacelera a partir de 0,84 e chega parada.
const travelled = (tau: number) => {
  const ta = 0.14;
  const td = 0.16;
  const vmax = 1 / (1 - ta / 2 - td / 2);
  if (tau < ta) return (vmax * tau * tau) / (2 * ta);
  if (tau > 1 - td) return 1 - (vmax * (1 - tau) * (1 - tau)) / (2 * td);
  return vmax * (ta / 2 + (tau - ta));
};

// Escala do voo: recua nos primeiros 0,16, fica pequena e volta a 1 ao pousar.
const flightScale = (tau: number) => (tau < 0.16 ? 1 - (1 - FAR) * smooth(tau / 0.16) : tau < 0.82 ? FAR : FAR + (1 - FAR) * smooth((tau - 0.82) / 0.18));

// Geometria da folha: N meia largura, a meia altura, b onde começam os vincos dos cantos, w profundidade da quilha na cauda.
type Geo = { N: number; a: number; b: number; w: number };
type Face = {
  poly: Vec2[]; // no papel (u, v), origem no centro
  folded: Vec2[]; // só nas abas: o polígono depois de dobrado
  flap: boolean;
  wing: boolean; // fica do lado da asa do vinco (senão, do lado da quilha)
  half: -1 | 1; // −1 metade de cima (v ≤ 0), 1 metade de baixo
  n0z: number; // lado da frente da folha plana
  du: [number, number, number, number, number]; // p, q, r, s, det do papel, para resolver a afim
};

const buildFaces = (g: Geo): Face[] => {
  const { N, a, b, w } = g;
  // O vinco das asas é diagonal, do bico (N, 0) até a cauda (−N, −w): quilha em triângulo e asas que alargam
  // para trás, a silhueta de um dardo de papel. A aba do canto dobrada cai inteira do lado da asa (a lasca do
  // lado da quilha tem ~1 px e vai junto).
  const top: { poly: Vec2[]; flap: boolean; wing: boolean }[] = [
    { poly: [[-N, -w], [N, 0], [-N, 0]], flap: false, wing: false }, // quilha
    { poly: [[-N, -a], [b, -a], [N, 0], [-N, -w]], flap: false, wing: true }, // asa
    { poly: [[b, -a], [N, -a], [N, 0]], flap: true, wing: true }, // aba do canto
  ];
  // Reflexão pelo vinco do canto (reta por (b, −a) na direção (1, 1)).
  const fold = ([u, v]: Vec2): Vec2 => [b + (v + a), -a + (u - b)];
  const faces: Face[] = [];
  for (const half of [-1, 1] as const) {
    for (const t of top) {
      // A metade de baixo é o espelho v → −v, na ordem inversa para manter o sentido.
      const mirror = (p: Vec2[]): Vec2[] => (half < 0 ? p : p.map(([u, v]): Vec2 => [u, -v]).reverse());
      const poly = mirror(t.poly);
      const folded = t.flap ? mirror(t.poly.map(fold)) : [];
      const [p0, p1, p2] = poly;
      const p = p1[0] - p0[0];
      const q = p2[0] - p0[0];
      const r = p1[1] - p0[1];
      const s = p2[1] - p0[1];
      faces.push({ poly, folded, flap: t.flap, wing: t.wing, half, n0z: p * s - q * r, du: [p, q, r, s, p * s - q * r] });
    }
  }
  return faces;
};

// Vértice i da face no espaço (antes de R). al, be, ga são os ângulos dos cantos, do meio e das asas.
const foldVertex = (g: Geo, f: Face, i: number, al: number, be: number, ga: number): Vec3 => {
  const [u, v] = f.poly[i];
  if (f.flap && al < Math.PI) {
    // Passo 1: a aba gira em torno do vinco do canto. O sinal (cima +, baixo −) leva o meio da aba para z < 0,
    // ou seja, para trás da folha; a camada atrás da folha cresce com o ângulo.
    const top = f.half < 0;
    const py = top ? -g.a : g.a;
    const o = rotAbout([u - g.b, v - py, 0], top ? [SQ, SQ, 0] : [SQ, -SQ, 0], top ? al : -al);
    return [g.b + o[0], py + o[1], o[2] - (LAYER * al) / Math.PI];
  }
  let uu = u;
  let vv = v;
  let d = 0;
  if (f.flap) {
    [uu, vv] = f.folded[i];
    d = -LAYER;
  }
  // Passo 2: cada metade gira em torno do vinco do meio (eixo x) e vai para trás.
  const sg = f.half < 0 ? 1 : -1;
  let pt = rotAbout([uu, vv, d], [1, 0, 0], sg * be);
  if (f.wing) {
    // Passo 3: a asa volta para fora em torno do vinco diagonal, já girado pelo passo 2.
    const tail = rotAbout([-g.N, f.half < 0 ? -g.w : g.w, 0], [1, 0, 0], sg * be);
    const axis = norm(sub([g.N, 0, 0], tail));
    pt = add(rotAbout(sub(pt, tail), axis, -sg * ga), tail);
  }
  return pt;
};

// Ângulos da dobra em t: cantos, meio e asas em sequência na ida, ao contrário na volta.
const foldAngles = (t: number): [number, number, number] => {
  if (t < FOLD + FLY) return [Math.PI * ease(t / 0.18), BETA * ease((t - 0.18) / 0.22), GAMMA * ease((t - 0.4) / 0.2)];
  return [Math.PI * (1 - ease((t - 2.82) / 0.18)), BETA * (1 - ease((t - 2.6) / 0.22)), GAMMA * (1 - ease((t - 2.4) / 0.2))];
};

// Frente do papel: o mesmo retângulo, borda e rótulo do botão. Ícones dentro de children não entram no papel.
const paperTexture = (button: HTMLElement, w: number, h: number, dpr: number) => {
  const tex = document.createElement("canvas");
  tex.width = Math.max(1, Math.round(w * dpr));
  tex.height = Math.max(1, Math.round(h * dpr));
  const c = tex.getContext("2d");
  if (!c) return tex;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const round = (x: number, y: number, rw: number, rh: number, rr: number) => {
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + rw, y, x + rw, y + rh, rr);
    c.arcTo(x + rw, y + rh, x, y + rh, rr);
    c.arcTo(x, y + rh, x, y, rr);
    c.arcTo(x, y, x + rw, y, rr);
    c.closePath();
  };
  round(0, 0, w, h, 6);
  c.fillStyle = PAPER;
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = "rgba(255,255,255,0.06)";
  c.fillRect(1, 1, w - 2, 1);
  c.restore();
  round(0.5, 0.5, w - 1, h - 1, 5.5);
  c.lineWidth = 1;
  c.strokeStyle = PAPER_EDGE;
  c.stroke();
  const cs = getComputedStyle(button);
  c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  c.fillStyle = PAPER_INK;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText((button.textContent ?? "").trim(), w / 2, h / 2 + 0.5);
  return tex;
};

/** Botão de papel: no clique dobra até virar um avião, voa um looping pela área e desdobra de volta. */
const OrigamiButton = forwardRef<HTMLButtonElement, OrigamiButtonProps>(function OrigamiButton(
  { children, className = "", onFold, onReturn, onClick, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const reduced = useRef(false);
  const startRef = useRef<(() => void) | null>(null);
  // Lido ao vivo pelo laço: trocar o callback no meio do voo não reinicia nada.
  const settings = useRef({ onFold, onReturn });
  useEffect(() => {
    settings.current = { onFold, onReturn };
  }, [onFold, onReturn]);

  useEffect(() => {
    const playground = playgroundRef.current;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!playground || !wrap || !canvas) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = query.matches;
    const onMotion = (event: MediaQueryListEvent) => {
      reduced.current = event.matches;
    };
    query.addEventListener("change", onMotion);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return () => query.removeEventListener("change", onMotion);
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let geo: Geo = { N: 0, a: 0, b: 0, w: 0 };
    let faces: Face[] = [];
    let tex: HTMLCanvasElement | null = null;
    let flight: Flight | null = null;
    let trail: { x: number; y: number; t: number }[] = [];
    let active = false;
    let clock = 0;
    let frame = 0;
    let last = 0;

    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Pinta um quadro da linha do tempo em t (0 a 3 s).
    const render = (t: number) => {
      if (!tex || !flight) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Pose: atitude R, centro na tela e escala. Fora do voo fica em B com escala 1.
      let q = Q_ID;
      let px = width * 0.5;
      let py = height * 0.64;
      let sc = 1;
      let flying = false;
      if (t < FOLD) {
        q = slerp(Q_ID, flight.quat[0], ease((t - 0.18) / 0.42));
      } else if (t < FOLD + FLY) {
        flying = true;
        const tau = (t - FOLD) / FLY;
        const at = travelled(tau) * (SAMPLES - 1);
        const i0 = Math.min(Math.floor(at), SAMPLES - 2);
        const fr = at - i0;
        const p = add(mul(flight.pos[i0], 1 - fr), mul(flight.pos[i0 + 1], fr));
        q = slerp(flight.quat[i0], flight.quat[i0 + 1], fr);
        px = p[0];
        py = p[1];
        sc = flightScale(tau) * (DEPTH / (DEPTH - p[2]));
      } else {
        q = slerp(flight.quat[SAMPLES - 1], Q_ID, ease((t - 2.4) / 0.42));
      }
      const R = toMat3(q);
      const { N, a } = geo;

      // Rastro leve atrás do avião: o caminho do centro (a cauda serrilha quando o avião gira), só durante o voo;
      // fica atrás do corpo e some sozinho depois do pouso.
      if (flying && (!trail.length || trail[trail.length - 1].t !== t)) {
        trail.push({ x: px, y: py, t });
      }
      trail = trail.filter((p) => t - p.t < TRAIL);
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const age = t - (trail[i].t + trail[i - 1].t) / 2;
        ctx.strokeStyle = `rgba(201,210,234,${(0.16 * clamp(1 - age / TRAIL, 0, 1)).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }

      // Vértices de cada face: dobra → R → tela.
      const [al, be, ga] = foldAngles(t);
      const crease = t < 0.1 ? t / 0.1 : t > 2.9 ? (TOTAL - t) / 0.1 : 1;
      const posed = faces.map((f) => {
        const s: Vec2[] = [];
        const w3: Vec3[] = [];
        let zs = 0;
        for (let i = 0; i < f.poly.length; i++) {
          const r = mulMV(R, foldVertex(geo, f, i, al, be, ga));
          w3.push(r);
          s.push([px + sc * r[0], py + sc * r[1]]);
          zs += r[2];
        }
        const n = norm(cross(sub(w3[1], w3[0]), sub(w3[2], w3[0])));
        return { f, s, n, z: zs / f.poly.length, front: Math.sign(n[2]) === Math.sign(f.n0z) };
      });
      posed.sort((x, y) => x.z - y.z);

      for (const { f, s, n, front } of posed) {
        // Afim do papel (u, v) para a tela, resolvida dos três primeiros vértices.
        const [p, qq, r, ss, det] = f.du;
        const [u0, v0] = f.poly[0];
        const dx1 = s[1][0] - s[0][0];
        const dx2 = s[2][0] - s[0][0];
        const dy1 = s[1][1] - s[0][1];
        const dy2 = s[2][1] - s[0][1];
        const A = (dx1 * ss - dx2 * r) / det;
        const B = (dy1 * ss - dy2 * r) / det;
        const C = (-dx1 * qq + dx2 * p) / det;
        const D = (-dy1 * qq + dy2 * p) / det;
        const E = s[0][0] - A * u0 - C * v0;
        const F = s[0][1] - B * u0 - D * v0;
        ctx.save();
        ctx.setTransform(A * dpr, B * dpr, C * dpr, D * dpr, E * dpr, F * dpr);
        const trace = () => {
          ctx.beginPath();
          f.poly.forEach(([u, v], i) => (i ? ctx.lineTo(u, v) : ctx.moveTo(u, v)));
          ctx.closePath();
        };
        trace();
        ctx.clip();
        if (front) {
          ctx.drawImage(tex, -N, -a, geo.N * 2, a * 2);
        } else {
          ctx.fillStyle = PAPER_BACK;
          ctx.fill();
        }
        // Sombra da dobra: uma luz do alto à esquerda; a folha plana de frente dá 0 (sem salto na troca DOM↔canvas).
        const nv: Vec3 = n[2] >= 0 ? n : mul(n, -1);
        const shade = dot(nv, LIGHT) - LIGHT[2];
        if (shade < -0.002) {
          ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, -shade * 0.85).toFixed(3)})`;
          ctx.fill();
        } else if (shade > 0.002) {
          ctx.fillStyle = `rgba(223,231,255,${Math.min(0.3, shade * 0.55).toFixed(3)})`;
          ctx.fill();
        }
        // Vincos nítidos: ≈ 0,9 px na tela, qualquer que seja a escala da face.
        if (crease > 0) {
          ctx.lineWidth = 0.9 / Math.max(0.3, Math.sqrt(Math.abs(A * D - B * C)));
          ctx.strokeStyle = `rgba(223,231,255,${(0.22 * crease).toFixed(3)})`;
          trace();
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    const finish = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      active = false;
      trail = [];
      tex = null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      wrap.style.opacity = "1";
      wrap.querySelector("button")?.removeAttribute("aria-busy");
      busy.current = false;
      settings.current.onReturn?.();
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      clock += dt;
      if (clock >= TOTAL) {
        finish();
        return;
      }
      render(clock);
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      const button = wrap.querySelector("button");
      if (!button) return;
      busy.current = true;
      measure();
      const w = button.offsetWidth;
      const h = button.offsetHeight;
      const a = h / 2;
      geo = { N: w / 2, a, b: w / 2 - a, w: 0.55 * a };
      faces = buildFaces(geo);
      tex = paperTexture(button, w, h, dpr);
      flight = buildFlight(width, height);
      trail = [];
      clock = 0;
      last = 0;
      active = true;
      button.setAttribute("aria-busy", "true");
      // O primeiro quadro entra no canvas antes de esconder o botão de verdade: sem piscar.
      render(0);
      wrap.style.opacity = "0";
      settings.current.onFold?.();
      frame = requestAnimationFrame(step);
    };
    startRef.current = start;

    // Redimensionar no meio do voo refaz o caminho; o voo segue pelo mesmo tempo normalizado.
    const observer = new ResizeObserver(() => {
      measure();
      if (active) {
        flight = buildFlight(width, height);
        render(clock);
      }
    });
    observer.observe(playground);
    measure();

    return () => {
      observer.disconnect();
      query.removeEventListener("change", onMotion);
      cancelAnimationFrame(frame);
      if (active) {
        wrap.style.opacity = "1";
        wrap.querySelector("button")?.removeAttribute("aria-busy");
        busy.current = false;
      }
      startRef.current = null;
    };
  }, []);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy.current) return;
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    if (reduced.current || !startRef.current) {
      onFold?.();
      onReturn?.();
      return;
    }
    startRef.current();
  };

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* o botão de verdade; some enquanto a folha está no canvas */}
      <span
        ref={wrapRef}
        className="pointer-events-auto absolute top-[64%] left-1/2 inline-flex"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          onClick={handleClick}
          className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#2c3552] bg-[#121726] px-5 text-sm font-semibold whitespace-nowrap text-[#dfe7ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-6px_rgb(0_0_0/0.7)] transition-transform duration-150 outline-none select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </button>
      </span>
      {/* a folha de papel, dobrada e em voo */}
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-[1] size-full" />
    </div>
  );
});

export default OrigamiButton;
