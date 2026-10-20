"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import { CanvasTexture, ExtrudeGeometry, Matrix4, Shape, ShapeGeometry, type Group, type InstancedMesh } from "three";
import { GLARE } from "./CssDevice";
import type { DeviceKind } from "./screens";

// No <Html transform> do drei, 1px de CSS vale 10/400 unidades: o modelo é medido em px × K para a
// tela do componente casar com a do aparelho.
const K = 0.025;

const TITANIUM = { color: "#7a8396", metalness: 0.72, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 } as const;
const GLASS = { color: "#030405", metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05 } as const;

/**
 * Retângulo arredondado extrudado: a forma de um celular, de uma tampa ou de uma tecla, com borda
 * chanfrada. O chanfro cresce para fora: a peça fica com w + 2 × bevel de largura. detail baixo para
 * peças pequenas e repetidas (teclas).
 */
function slab(w: number, h: number, r: number, depth: number, bevel: number, detail = 24) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new ExtrudeGeometry(s, {
    depth: Math.max(depth - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: detail >= 8 ? 4 : 2,
    curveSegments: detail,
  });
  g.center();
  return g;
}

/**
 * Celular ou notebook em three.js, com o componente ao vivo na tela. Gira um pouco seguindo o mouse e
 * flutua devagar. Se o aparelho não der conta (5 quadros seguidos acima de 120 ms), chama onSlow e
 * quem usa troca pela moldura em CSS.
 */
export default function Device3D({
  kind,
  side = 0,
  screen,
  onSlow,
}: {
  kind: DeviceKind;
  side?: -1 | 0 | 1;
  screen: ReactNode;
  onSlow: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)));
    if (host.current) io.observe(host.current);
    return () => {
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
    };
  }, []);

  // Os dois com câmera de perspectiva. No notebook, a largura da base é corrigida na geometria (ver Laptop).
  const laptop = kind === "laptop";
  const camera = laptop
    ? { fov: 22, position: [0, 4, 27.5] as [number, number, number] }
    : { fov: 22, position: [0, 0, 40] as [number, number, number] };

  return (
    <div ref={host} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={camera}
        resize={{ offsetSize: true }}
        frameloop={visible ? "always" : "never"}
      >
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#dfe7ff", "#0b1230", 0.7]} />
        <directionalLight position={[4, 9, 7]} intensity={1.8} />
        <directionalLight position={[-6, 3, 4]} intensity={0.6} color="#a9bbff" />
        <pointLight position={[0, -9, 5]} color="#1f5bff" intensity={90} distance={30} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 7, 5]} scale={[12, 2.5, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2} position={[-8, 1, 3]} rotation-y={Math.PI / 2} scale={[10, 7, 1]} color="#a9bbff" />
          <Lightformer form="rect" intensity={1.2} position={[8, 1, 3]} rotation-y={-Math.PI / 2} scale={[10, 7, 1]} color="#a9bbff" />
          <Lightformer form="rect" intensity={3.2} position={[0, -6, 3]} scale={[14, 1, 1]} color="#1f5bff" />
        </Environment>
        <Watchdog onSlow={onSlow} />
        {kind === "laptop" && <LookAt y={0.2} />}
        <Rig mouse={mouse} yaw={laptop ? 0 : side * -0.24} pitch={laptop ? 0.04 : 0.03} amount={laptop ? 0.5 : 1}>
          {kind === "phone" ? <Phone screen={screen} /> : <Laptop screen={screen} />}
        </Rig>
      </Canvas>
    </div>
  );
}

/** Aponta a câmera para o centro do notebook (vista de leve de cima, mostrando o teclado). */
function LookAt({ y }: { y: number }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, y]);
  return null;
}

/** Desiste do 3D quando o aparelho não dá conta. */
function Watchdog({ onSlow }: { onSlow: () => void }) {
  const slow = useRef(0);
  const done = useRef(false);
  useFrame((_, delta) => {
    if (done.current) return;
    slow.current = delta > 0.12 ? slow.current + 1 : 0;
    if (slow.current >= 5) {
      done.current = true;
      onSlow();
    }
  });
  return null;
}

/** Inclinação que segue o mouse (suavizada) e flutuação lenta. */
function Rig({
  mouse,
  yaw,
  pitch,
  amount,
  children,
}: {
  mouse: React.RefObject<{ x: number; y: number }>;
  yaw: number;
  pitch: number;
  /** Quanto o giro segue o mouse (o notebook gira menos, para as quinas não saírem do quadro). */
  amount: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-delta * 3);
    g.rotation.y += (yaw + mouse.current.x * 0.22 * amount - g.rotation.y) * k;
    g.rotation.x += (pitch + mouse.current.y * 0.1 * amount - g.rotation.x) * k;
    g.position.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.12;
  });
  return <group ref={ref}>{children}</group>;
}

/** Tela do aparelho: o componente ao vivo com o reflexo do vidro por cima, igual ao da moldura em CSS. */
function Screen({ radius, children }: { radius: number | string; children: ReactNode }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden" }}>
      {children}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: GLARE }} />
    </div>
  );
}

// Plástico das faixas de antena e preto fosco dos furos (portas, alto-falante).
const BAND = { color: "#363c48", metalness: 0.1, roughness: 0.55 } as const;
const HOLE = { color: "#050608", roughness: 0.85 } as const;

function Phone({ screen }: { screen: ReactNode }) {
  const W = 310 * K;
  const H = 540 * K;
  const D = 0.95;
  const EDGE = 0.16; // chanfro do corpo: as laterais ficam 0,16 para fora do contorno W × H
  const body = useMemo(() => slab(W, H, 46 * K, D, EDGE), [W, H]);
  // Vidro quase até a borda: sobra só um filete do aro na frente, como no aparelho de verdade.
  const glass = useMemo(() => slab(W - 0.06, H - 0.06, 45 * K, 0.04, 0), [W, H]);
  const button = useMemo(() => slab(0.14, 1, 0.06, 0.34, 0.03), []);
  const earpiece = useMemo(() => slab(1.25, 0.05, 0.025, 0.01, 0, 6), []);
  // Botões saem 0,05 da lateral (o botão tem 0,1 de meia largura com o chanfro).
  const bx = W / 2 + EDGE + 0.05 - 0.1;
  const wall = W / 2 + EDGE;
  return (
    <group>
      <mesh geometry={body}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, D / 2 + 0.005]}>
        <meshPhysicalMaterial {...GLASS} />
      </mesh>
      {/* alto-falante de ouvido, na borda de cima do vidro */}
      <mesh geometry={earpiece} position={[0, H / 2 - 0.16, D / 2 + 0.03]}>
        <meshStandardMaterial color="#1c2029" roughness={0.7} />
      </mesh>
      {/* botões: ação e volume à esquerda, power à direita */}
      <mesh geometry={button} position={[-bx, 3.9, 0]} scale={[1, 0.75, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={button} position={[-bx, 2.5, 0]} scale={[1, 1.3, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={button} position={[-bx, 0.95, 0]} scale={[1, 1.3, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={button} position={[bx, 2.1, 0]} scale={[1, 2.05, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      {/* faixas de antena no aro: nas laterais, perto das quinas, e no topo e no pé */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <group key={`${sx}${sy}`}>
            <mesh position={[sx * wall, sy * (H / 2 - 1.55), 0]}>
              <boxGeometry args={[0.03, 0.07, D - 0.36]} />
              <meshStandardMaterial {...BAND} />
            </mesh>
            <mesh position={[sx * (W / 2 - 1.7), sy * (H / 2 + EDGE), 0]}>
              <boxGeometry args={[0.07, 0.03, D - 0.36]} />
              <meshStandardMaterial {...BAND} />
            </mesh>
          </group>
        )),
      )}
      <Html transform position={[0, 0, D / 2 + 0.03]} pointerEvents="none" zIndexRange={[10, 0]}>
        <Screen radius={34}>{screen}</Screen>
      </Html>
    </group>
  );
}

// Teclado do notebook, em unidades do three (o desenho da base: x para a direita, y para o fundo).
// Cada fileira soma 14,5 teclas de largura, como no teclado de notebook da Apple.
const U = 0.7; // largura de uma tecla comum
const GAP = 0.09; // vão entre as teclas
const FN_ROW = 0.78; // a fileira de funções é um pouco mais baixa
const KEY_H = 0.05;
const KEY_BEVEL = 0.012;
const KW = 14.5 * U;
const KD = (FN_ROW + 5) * U;
const ROWS = [
  [1.55, ...Array(12).fill(1), 0.95], // esc, F1–F12, Touch ID
  [...Array(13).fill(1), 1.5], // números e delete
  [1.5, ...Array(12).fill(1), 1], // tab, QWERTY
  [1.8, ...Array(11).fill(1), 1.7], // caps lock, ASDF, return
  [2.3, ...Array(10).fill(1), 2.2], // shifts
];
const BOTTOM = [1, 1, 1, 1.25, 5, 1.25, 1]; // fn, control, option, command, espaço, command, option

/** Centro e tamanho de cada tecla, com o teclado centrado em (0, 0). */
const KEYS = (() => {
  const keys: { x: number; y: number; w: number; h: number }[] = [];
  const put = (x: number, y: number, w: number, h: number) => keys.push({ x, y, w: w - GAP, h: h - GAP });
  let top = KD / 2;
  ROWS.forEach((widths, i) => {
    const h = (i === 0 ? FN_ROW : 1) * U;
    let x = -KW / 2;
    for (const w of widths) {
      put(x + (w * U) / 2, top - h / 2, w * U, h);
      x += w * U;
    }
    top -= h;
  });
  // Última fileira: modificadores, espaço e as setas em T invertido (meia altura).
  let x = -KW / 2;
  for (const w of BOTTOM) {
    put(x + (w * U) / 2, top - U / 2, w * U, U);
    x += w * U;
  }
  const upper = top - U / 4;
  const lower = top - (3 * U) / 4;
  put(x + U / 2, lower, U, U / 2); // ←
  put(x + U * 1.5, upper, U, U / 2); // ↑
  put(x + U * 1.5, lower, U, U / 2); // ↓
  put(x + U * 2.5, lower, U, U / 2); // →
  return keys;
})();

/** As teclas numa malha instanciada só (uma chamada de desenho para todas), com o centro do teclado em (0, y). */
function Keys({ y, z }: { y: number; z: number }) {
  const ref = useRef<InstancedMesh>(null);
  const key = useMemo(() => slab(1, 1, 0.14, KEY_H, KEY_BEVEL, 3), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // A tecla-modelo tem 1 + 2 × chanfro de lado: a escala desconta o chanfro.
    const unit = 1 + KEY_BEVEL * 2;
    const m = new Matrix4();
    KEYS.forEach((k, i) => {
      m.makeScale(k.w / unit, k.h / unit, 1);
      m.setPosition(k.x, y + k.y, z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [y, z]);
  return (
    <instancedMesh ref={ref} args={[key, undefined, KEYS.length]} frustumCulled={false}>
      {/* Teclas pretas, um pouco mais claras que o fundo do teclado para a grade aparecer. */}
      <meshPhysicalMaterial color="#1d2028" roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.4} />
    </instancedMesh>
  );
}

/** Furos do alto-falante numa textura (pontos em quincôncio): em ângulo raso ela filtra sem cintilar. */
function useGrille() {
  const gl = useThree((s) => s.gl);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 448;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#fff";
      for (let row = 0; row * 8 + 4 < c.height; row++) {
        for (let x = row % 2 ? 8 : 4; x < c.width - 2; x += 8) {
          ctx.beginPath();
          ctx.arc(x, row * 8 + 4, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const t = new CanvasTexture(c);
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    return t;
  }, [gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Entalhe de abrir a tampa: meia elipse na beirada da frente, mais escura por ser côncava. */
function notchShape(w: number, d: number) {
  const s = new Shape();
  s.absellipse(0, 0, w / 2, d, Math.PI, 0, true);
  return new ShapeGeometry(s, 24);
}

// Portas nas laterais da base: lado, posição (de trás para a frente), largura e altura.
const PORTS: [-1 | 1, number, number, number][] = [
  [-1, 3.2, 0.62, 0.07], // MagSafe
  [-1, 2.35, 0.36, 0.1], // USB-C
  [-1, 1.75, 0.36, 0.1], // USB-C
  [-1, -1.7, 0.13, 0.13], // fone
  [1, 3.1, 0.66, 0.12], // HDMI
  [1, 2.3, 0.36, 0.1], // USB-C
  [1, -1.2, 1, 0.05], // cartão SD
];

function Laptop({ screen }: { screen: ReactNode }) {
  const LW = 548 * K; // tampa
  const LH = 361 * K;
  const LT = 0.22;
  // Base 0,1 mais larga que a tampa (13,7): na tela ela sai do mesmo tamanho.
  const BW = LW + 0.1;
  const BL = 9.6; // profundidade da base (de trás para a frente)
  const BT = 0.36;
  const BE = 0.08; // chanfro da base: as laterais ficam 0,08 para fora do contorno
  const top = BT / 2; // face de cima da base
  const lid = useMemo(() => slab(LW, LH, 18 * K, LT, 0.05), [LW, LH]);
  const lidGlass = useMemo(() => slab(LW - 0.1, LH - 0.1, 16 * K, 0.02, 0), [LW, LH]);
  const base = useMemo(() => slab(BW, BL, 0.5, BT, BE), [BW]);
  const well = useMemo(() => slab(KW + 0.24, KD + 0.24, 0.22, 0.012, 0), []);
  const pad = useMemo(() => slab(6.2, 3.5, 0.32, 0.012, 0), []);
  const padEdge = useMemo(() => slab(6.28, 3.58, 0.36, 0.008, 0), []);
  const notch = useMemo(() => notchShape(2, 0.42), []);
  const grille = useGrille();

  // Teclado logo à frente da dobradiça; trackpad grande, centrado no espaço que sobra até a frente.
  const kbY = BL / 2 - 0.85 - KD / 2;
  const padY = -BL / 2 + 0.45 + 3.5 / 2;
  // Câmera no meio da borda de cima da tela (entre o vidro e a imagem).
  const camY = (LH / 2 - 0.05 + 2 * K + 162.5 * K) / 2;

  return (
    // 80% do tamanho e um pouco mais alto: cabe inteiro no quadro, parado e com o mouse nos cantos.
    <group position={[0, -3.3, 0]} scale={0.8}>
      {/* base deitada: a forma é desenhada em XY e girada para o chão */}
      <group rotation-x={-Math.PI / 2}>
        {/* Mesmo titânio dos celulares. A base é uma superfície grande virada para cima e reflete em cheio
            a luz branca de cima; com o reflexo menor ela não estoura e fica da mesma família dos celulares. */}
        <mesh geometry={base}>
          <meshPhysicalMaterial {...TITANIUM} envMapIntensity={0.55} />
        </mesh>
        {/* fundo preto do teclado e as teclas por cima */}
        <mesh geometry={well} position={[0, kbY, top + 0.006]}>
          <meshStandardMaterial color="#040506" roughness={0.85} />
        </mesh>
        <Keys y={kbY} z={top + 0.012 + KEY_H / 2} />
        {/* grades do alto-falante dos dois lados do teclado */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (KW / 2 + 0.67), kbY, top + 0.004]}>
            <planeGeometry args={[0.6, KD]} />
            <meshStandardMaterial color="#07080b" roughness={0.9} alphaMap={grille} transparent depthWrite={false} />
          </mesh>
        ))}
        {/* trackpad com um filete escuro em volta */}
        <mesh geometry={padEdge} position={[0, padY, top + 0.004]}>
          <meshStandardMaterial color="#2a2f3a" roughness={0.6} />
        </mesh>
        <mesh geometry={pad} position={[0, padY, top + 0.008]}>
          <meshPhysicalMaterial {...TITANIUM} color="#6a7284" roughness={0.42} envMapIntensity={0.55} />
        </mesh>
        <mesh geometry={notch} position={[0, -BL / 2, top + 0.004]}>
          <meshPhysicalMaterial {...TITANIUM} color="#576072" roughness={0.5} envMapIntensity={0.42} />
        </mesh>
        {PORTS.map(([side, y, w, h]) => (
          <mesh key={`${side}${y}`} position={[side * (BW / 2 + BE), y, 0]}>
            <boxGeometry args={[0.03, w, h]} />
            <meshStandardMaterial {...HOLE} />
          </mesh>
        ))}
      </group>
      {/* dobradiça: cilindro escuro sob a borda de baixo da tela */}
      <mesh position={[0, top + 0.02, -BL / 2 + 0.25]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.17, 0.17, LW - 1.4, 32]} />
        <meshPhysicalMaterial color="#14161c" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* tampa presa na dobradiça do fundo, aberta um pouco além de 90° */}
      <group position={[0, top, -BL / 2 + 0.25]} rotation-x={-0.14}>
        <group position={[0, LH / 2, 0]}>
          <mesh geometry={lid}>
            <meshPhysicalMaterial {...TITANIUM} />
          </mesh>
          <mesh geometry={lidGlass} position={[0, 0, LT / 2 + 0.004]}>
            <meshPhysicalMaterial {...GLASS} />
          </mesh>
          {/* câmera: anel escuro e a lente com reflexo azulado */}
          <mesh position={[0, camY, LT / 2 + 0.016]}>
            <circleGeometry args={[0.07, 24]} />
            <meshStandardMaterial color="#10131b" roughness={0.3} />
          </mesh>
          <mesh position={[0, camY, LT / 2 + 0.018]}>
            <circleGeometry args={[0.032, 20]} />
            <meshPhysicalMaterial color="#1b2440" metalness={0.4} roughness={0.15} clearcoat={1} />
          </mesh>
          <Html transform position={[0, 2 * K, LT / 2 + 0.03]} pointerEvents="none" zIndexRange={[10, 0]}>
            {/* cantos de cima arredondados, como a tela do MacBook */}
            <Screen radius="6px 6px 3px 3px">{screen}</Screen>
          </Html>
        </group>
      </group>
    </group>
  );
}
