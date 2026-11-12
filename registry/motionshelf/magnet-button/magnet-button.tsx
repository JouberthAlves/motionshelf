"use client";

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes } from "react";

export type MagnetButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** How far the button can be pulled toward the pointer, in px. */
  pull?: number;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// O cursor é um ímã: o campo de dois polos (cursor +1, centro do botão -1) orienta uma grade de limalhas
// de ferro e puxa o botão, que balança numa mola ao ser solto. px e segundos, y para baixo.
const SPACING = 18; // grade das limalhas
const FILING = 9; // comprimento do traço
const FILING_W = 1.2;
const MARGIN = 6; // folga em volta do botão onde não há limalha
const SOFT = 400; // suavização do campo (20²): evita o infinito em cima de um polo
const SMOOTH = 0.08; // s: constante de tempo do ângulo e do brilho
const NEAR = 60; // px: limalhas perto de um polo clareiam
const MIN_ALPHA = 0.15;
const REST_POLE = 0.35; // intensidade do polo do botão sem cursor
const STIFF = 160;
const DAMP = 2 * Math.sqrt(STIFF) * 0.55;
const MAX_TILT = 4; // graus
const HORSE = 18; // tamanho do canvas do ímã
const HORSE_OFFSET = 14;

// Cores em RGB para misturar o cinza das limalhas com o metal claro perto dos polos.
const IRON = [139, 147, 167];
const BRIGHT = [201, 210, 234];

/** Botão que é puxado por um ímã (o cursor) enquanto limalhas de ferro desenham o campo atrás dele. */
const MagnetButton = forwardRef<HTMLButtonElement, MagnetButtonProps>(function MagnetButton(
  { children, className = "", pull = 36, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonWrapRef = useRef<HTMLSpanElement>(null);
  const magnetRef = useRef<HTMLCanvasElement>(null);

  // Lido ao vivo pelo laço: mudar a prop no meio do puxão não reinicia nada.
  const settings = useRef({ pull });
  useEffect(() => {
    settings.current = { pull };
  }, [pull]);

  useEffect(() => {
    const playground = playgroundRef.current;
    const wrap = buttonWrapRef.current;
    const canvas = canvasRef.current;
    const magnet = magnetRef.current;
    if (!playground || !wrap || !canvas || !magnet) return;
    // Movimento reduzido acompanhado ao vivo (ver onMotionChange, mais abaixo).
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let bw = 0;
    let bh = 0;
    let count = 0;
    // Por limalha: posição, ângulo dobrado suavizado (cos 2a, sin 2a) e brilho atual.
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let cs = new Float32Array(0);
    let sn = new Float32Array(0);
    let al = new Float32Array(0);
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    let rot = 0; // graus
    let cursor: { x: number; y: number } | null = null;
    let frame = 0;
    let last = 0;

    const cx = () => width / 2;
    const cy = () => height / 2;

    // Cabeça do ímã em ferradura, desenhada uma vez com as pontas para a direita (o CSS gira o canvas).
    const drawHorseshoe = () => {
      const mctx = magnet.getContext("2d");
      if (!mctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      magnet.width = Math.round(HORSE * dpr);
      magnet.height = Math.round(HORSE * dpr);
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, HORSE, HORSE);
      mctx.lineWidth = 5;
      mctx.lineCap = "butt";
      mctx.strokeStyle = "#8b93a7";
      mctx.beginPath();
      mctx.arc(8, 9, 4.5, Math.PI / 2, Math.PI * 1.5);
      mctx.moveTo(8, 4.5);
      mctx.lineTo(16, 4.5);
      mctx.moveTo(8, 13.5);
      mctx.lineTo(16, 13.5);
      mctx.stroke();
      // Pontas: N vermelha em cima, S clara embaixo.
      mctx.strokeStyle = "#ff4d4d";
      mctx.beginPath();
      mctx.moveTo(12.5, 4.5);
      mctx.lineTo(16, 4.5);
      mctx.stroke();
      mctx.strokeStyle = "#c9d2ea";
      mctx.beginPath();
      mctx.moveTo(12.5, 13.5);
      mctx.lineTo(16, 13.5);
      mctx.stroke();
    };

    // Campo no ponto (px, py): soma dos dois polos. Devolve o vetor, o alvo do brilho e a cor (mistura).
    const field = { ex: 0, ey: 0, near: 0 };
    const sample = (px: number, py: number) => {
      const bx = cx();
      const by = cy();
      let ex = 0;
      let ey = 0;
      let near = 0;
      // Polo do botão: -1 com cursor, intensidade reduzida sem cursor.
      const q = cursor ? -1 : -REST_POLE;
      let dx = px - bx;
      let dy = py - by;
      let d2 = dx * dx + dy * dy;
      let w = q / Math.pow(d2 + SOFT, 1.5);
      ex += dx * w;
      ey += dy * w;
      near = Math.max(near, 1 - Math.sqrt(d2) / NEAR);
      if (cursor) {
        dx = px - cursor.x;
        dy = py - cursor.y;
        d2 = dx * dx + dy * dy;
        w = 1 / Math.pow(d2 + SOFT, 1.5);
        ex += dx * w;
        ey += dy * w;
        near = Math.max(near, 1 - Math.sqrt(d2) / NEAR);
      }
      field.ex = ex;
      field.ey = ey;
      field.near = Math.max(0, near);
    };

    // Avança ângulo e brilho de cada limalha até o alvo. snap pula a suavização (estado parado).
    // Devolve as diferenças médias, usadas para saber se o laço pode parar.
    const nearArr = { current: new Float32Array(0) };
    const update = (dt: number, snap: boolean) => {
      const k = snap ? 1 : 1 - Math.exp(-dt / SMOOTH);
      let angDiff = 0;
      let alphaDiff = 0;
      for (let i = 0; i < count; i++) {
        sample(xs[i], ys[i]);
        const { ex, ey } = field;
        const mag2 = ex * ex + ey * ey;
        let tc = cs[i];
        let ts = sn[i];
        if (mag2 > 1e-24) {
          tc = (ex * ex - ey * ey) / mag2;
          ts = (2 * ex * ey) / mag2;
        }
        const mag = Math.sqrt(mag2);
        const ta = cursor ? Math.min(0.9, Math.max(MIN_ALPHA, 0.15 + 0.25 * Math.log(1 + mag * 9000))) : MIN_ALPHA;
        angDiff += Math.hypot(tc - cs[i], ts - sn[i]);
        alphaDiff += Math.abs(ta - al[i]);
        cs[i] += (tc - cs[i]) * k;
        sn[i] += (ts - sn[i]) * k;
        al[i] += (ta - al[i]) * k;
        nearArr.current[i] = field.near;
      }
      return { angle: count ? angDiff / count : 0, alpha: count ? alphaDiff / count : 0 };
    };

    const drawFilings = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = FILING_W;
      ctx.lineCap = "round";
      const half = FILING / 2 - FILING_W / 2; // a ponta redonda soma meia largura em cada lado
      for (let i = 0; i < count; i++) {
        const a = Math.atan2(sn[i], cs[i]) / 2;
        const ux = Math.cos(a) * half;
        const uy = Math.sin(a) * half;
        const m = nearArr.current[i];
        const r = Math.round(IRON[0] + (BRIGHT[0] - IRON[0]) * m);
        const g = Math.round(IRON[1] + (BRIGHT[1] - IRON[1]) * m);
        const b = Math.round(IRON[2] + (BRIGHT[2] - IRON[2]) * m);
        ctx.strokeStyle = `rgba(${r},${g},${b},${al[i].toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(xs[i] - ux, ys[i] - uy);
        ctx.lineTo(xs[i] + ux, ys[i] + uy);
        ctx.stroke();
      }
    };

    const placeMagnet = () => {
      if (!cursor) return;
      const mx = cursor.x - HORSE_OFFSET;
      const my = cursor.y - HORSE_OFFSET;
      const angle = Math.atan2(cy() - my, cx() - mx);
      magnet.style.transform = `translate(${mx - HORSE / 2}px, ${my - HORSE / 2}px) rotate(${angle}rad)`;
    };

    const placeButton = () => {
      wrap.style.transform = `translate(${cx() - bw / 2 + pos.x}px, ${cy() - bh / 2 + pos.y}px) rotate(${rot}deg)`;
    };

    // Monta a grade de limalhas, pulando as que cairiam atrás do botão (mais a folga).
    const build = () => {
      const cols = Math.max(0, Math.floor((width - 2 * FILING) / SPACING) + 1);
      const rows = Math.max(0, Math.floor((height - 2 * FILING) / SPACING) + 1);
      const maxN = cols * rows;
      const fx = new Float32Array(maxN);
      const fy = new Float32Array(maxN);
      const hx = bw / 2 + MARGIN;
      const hy = bh / 2 + MARGIN;
      let n = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = FILING + c * SPACING;
          const y = FILING + r * SPACING;
          if (Math.abs(x - cx()) < hx && Math.abs(y - cy()) < hy) continue;
          fx[n] = x;
          fy[n] = y;
          n++;
        }
      }
      count = n;
      xs = fx;
      ys = fy;
      cs = new Float32Array(n);
      sn = new Float32Array(n);
      al = new Float32Array(n).fill(MIN_ALPHA);
      nearArr.current = new Float32Array(n);
    };

    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      bw = wrap.offsetWidth;
      bh = wrap.offsetHeight;
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = Math.max(1, Math.round(width * dpr));
        const h = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      build();
    };

    // Estado parado: só o polo do botão, limalhas radiais, brilho no mínimo.
    const paintRest = () => {
      update(0, true);
      drawFilings();
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      const diff = update(dt, false);
      drawFilings();

      // Alvo do puxão: na direção do cursor, mais fraco quanto mais longe ele está.
      let tx = 0;
      let ty = 0;
      let f = 0;
      let dirX = 0;
      if (cursor) {
        const dx = cursor.x - cx();
        const dy = cursor.y - cy();
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          f = Math.pow(Math.min(1, Math.max(0, 1 - (dist - 40) / 260)), 1.5);
          dirX = dx / dist;
          tx = (dx / dist) * settings.current.pull * f;
          ty = (dy / dist) * settings.current.pull * f;
        }
      }
      // Mola amortecida: passa um pouco do alvo e balança ao soltar.
      vel.x += (STIFF * (tx - pos.x) - DAMP * vel.x) * dt;
      vel.y += (STIFF * (ty - pos.y) - DAMP * vel.y) * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      rot += (MAX_TILT * f * dirX - rot) * (1 - Math.exp(-dt / SMOOTH));
      placeButton();
      placeMagnet();

      const settled =
        !cursor &&
        Math.hypot(pos.x, pos.y) < 0.3 &&
        Math.hypot(vel.x, vel.y) < 1 &&
        Math.abs(rot) < 0.02 &&
        diff.angle < 0.002 &&
        diff.alpha < 0.004;
      if (settled) {
        pos.x = pos.y = vel.x = vel.y = rot = 0;
        placeButton();
        paintRest();
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (!frame && !reduced && !disabled) frame = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduced) return;
      const rect = playground.getBoundingClientRect();
      // Desconta a escala de quem mostra o componente reduzido: o cursor vira px do layout.
      const px = (event.clientX - rect.left) * (playground.clientWidth / (rect.width || 1));
      const py = (event.clientY - rect.top) * (playground.clientHeight / (rect.height || 1));
      const inside = px >= 0 && py >= 0 && px <= playground.clientWidth && py <= playground.clientHeight;
      cursor = inside ? { x: px, y: py } : null;
      magnet.style.opacity = inside ? "1" : "0";
      placeMagnet();
      start();
    };
    const release = () => {
      cursor = null;
      magnet.style.opacity = "0";
      start();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "touch") release();
    };

    // Repouso imediato: para o laço, esconde o ímã, volta o botão ao centro e as limalhas ao estado parado.
    const rest = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      cursor = null;
      magnet.style.opacity = "0";
      pos.x = pos.y = vel.x = vel.y = rot = 0;
      placeButton();
      paintRest();
    };
    // Ligado no meio do puxão, para na hora; desligado, o próximo movimento do cursor anima de novo.
    const onMotionChange = () => {
      reduced = motion.matches;
      if (reduced) rest();
    };
    motion.addEventListener("change", onMotionChange);

    const observer = new ResizeObserver(() => {
      measure();
      placeButton();
      if (!frame) paintRest();
    });
    observer.observe(playground);

    measure();
    drawHorseshoe();
    placeButton();
    paintRest();

    // Os ouvintes ficam ligados mesmo com movimento reduzido: cada um confere a preferência na hora.
    if (!disabled) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);
      document.documentElement.addEventListener("pointerleave", release);
      window.addEventListener("blur", release);
    }
    return () => {
      motion.removeEventListener("change", onMotionChange);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      cancelAnimationFrame(frame);
    };
  }, [disabled]);

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* limalhas de ferro, atrás do botão */}
      <canvas ref={canvasRef} aria-hidden="true" width={0} height={0} className="absolute inset-0 size-full" />
      {/* o botão de verdade, posicionado por transform */}
      <span ref={buttonWrapRef} className="pointer-events-auto absolute top-0 left-0 inline-flex" style={{ transform: "translate(-200px, -200px)" }}>
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#2c3552] bg-[#121726] px-5 text-sm font-semibold whitespace-nowrap text-[#dfe7ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-6px_rgb(0_0_0/0.7)] transition-transform duration-150 outline-none select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </button>
      </span>
      {/* ímã em ferradura que acompanha o cursor; só aparece com o cursor dentro */}
      <canvas
        ref={magnetRef}
        aria-hidden="true"
        width={HORSE}
        height={HORSE}
        className="absolute top-0 left-0"
        style={{ width: HORSE, height: HORSE, opacity: 0, transform: "translate(-200px, -200px)" }}
      />
    </div>
  );
});

export default MagnetButton;
