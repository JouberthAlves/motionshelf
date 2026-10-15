"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import { ExtrudeGeometry, Shape, type Group } from "three";
import type { DeviceKind } from "./screens";

// No <Html transform> do drei, 1px de CSS vale 10/400 unidades: o modelo é medido em px × K para a
// tela do componente casar com a do aparelho.
const K = 0.025;

const TITANIUM = { color: "#7a8396", metalness: 0.72, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 } as const;
const GLASS = { color: "#030405", metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05 } as const;

/** Retângulo arredondado extrudado: a forma de um celular ou de uma tampa, com borda chanfrada. */
function slab(w: number, h: number, r: number, depth: number, bevel: number) {
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
    bevelSegments: 4,
    curveSegments: 24,
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

  const camera = kind === "phone" ? { fov: 22, position: [0, 0, 40] as [number, number, number] } : { fov: 22, position: [0, 4, 27.5] as [number, number, number] };

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
        <Rig mouse={mouse} yaw={kind === "phone" ? side * -0.24 : 0} pitch={kind === "phone" ? 0.03 : 0.06}>
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
function Rig({ mouse, yaw, pitch, children }: { mouse: React.RefObject<{ x: number; y: number }>; yaw: number; pitch: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-delta * 3);
    g.rotation.y += (yaw + mouse.current.x * 0.22 - g.rotation.y) * k;
    g.rotation.x += (pitch + mouse.current.y * 0.1 - g.rotation.x) * k;
    g.position.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.12;
  });
  return <group ref={ref}>{children}</group>;
}

function Phone({ screen }: { screen: ReactNode }) {
  const W = 310 * K;
  const H = 540 * K;
  const D = 0.95;
  const body = useMemo(() => slab(W, H, 46 * K, D, 0.16), [W, H]);
  const glass = useMemo(() => slab(W - 0.14, H - 0.14, 44 * K, 0.04, 0), [W, H]);
  const button = useMemo(() => slab(0.14, 1, 0.06, 0.34, 0.03), []);
  return (
    <group>
      <mesh geometry={body}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, D / 2 + 0.005]}>
        <meshPhysicalMaterial {...GLASS} />
      </mesh>
      {/* botões: ação e volume à esquerda, power à direita */}
      <mesh geometry={button} position={[-W / 2 - 0.02, 3.9, 0]} scale={[1, 0.75, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={button} position={[-W / 2 - 0.02, 2.5, 0]} scale={[1, 1.3, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={button} position={[-W / 2 - 0.02, 0.95, 0]} scale={[1, 1.3, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <mesh geometry={button} position={[W / 2 + 0.02, 2.1, 0]} scale={[1, 2.05, 1]}>
        <meshPhysicalMaterial {...TITANIUM} />
      </mesh>
      <Html transform position={[0, 0, D / 2 + 0.03]} pointerEvents="none" zIndexRange={[10, 0]}>
        <div style={{ borderRadius: 34, overflow: "hidden" }}>{screen}</div>
      </Html>
    </group>
  );
}

function Laptop({ screen }: { screen: ReactNode }) {
  const LW = 548 * K; // tampa
  const LH = 361 * K;
  const LT = 0.22;
  const BW = LW; // base com a mesma largura da tampa, como num notebook de verdade
  const BL = 9.6; // profundidade da base (de trás para a frente)
  const BT = 0.36;
  const lid = useMemo(() => slab(LW, LH, 18 * K, LT, 0.05), [LW, LH]);
  const lidGlass = useMemo(() => slab(LW - 0.1, LH - 0.1, 16 * K, 0.02, 0), [LW, LH]);
  const base = useMemo(() => slab(BW, BL, 0.5, BT, 0.08), [BW]);
  const keyboard = useMemo(() => slab(BW * 0.78, BL * 0.42, 0.18, 0.01, 0), [BW]);
  const pad = useMemo(() => slab(BW * 0.3, BL * 0.28, 0.2, 0.01, 0), [BW]);

  return (
    <group position={[0, -4.2, 0]}>
      {/* base deitada: a forma é desenhada em XY e girada para o chão */}
      <group rotation-x={-Math.PI / 2}>
        <mesh geometry={base}>
          <meshPhysicalMaterial {...TITANIUM} color="#9aa2b2" />
        </mesh>
        <mesh geometry={keyboard} position={[0, BL * 0.14, BT / 2 + 0.006]}>
          <meshStandardMaterial color="#0b0d12" roughness={0.6} />
        </mesh>
        <mesh geometry={pad} position={[0, -BL * 0.27, BT / 2 + 0.006]}>
          <meshPhysicalMaterial {...TITANIUM} color="#aab2c2" roughness={0.4} />
        </mesh>
      </group>
      {/* tampa presa na dobradiça do fundo, aberta um pouco além de 90° */}
      <group position={[0, BT / 2, -BL / 2 + 0.25]} rotation-x={-0.14}>
        <group position={[0, LH / 2, 0]}>
          <mesh geometry={lid}>
            <meshPhysicalMaterial {...TITANIUM} color="#9aa2b2" />
          </mesh>
          <mesh geometry={lidGlass} position={[0, 0, LT / 2 + 0.004]}>
            <meshPhysicalMaterial {...GLASS} />
          </mesh>
          <Html transform position={[0, 2 * K, LT / 2 + 0.03]} pointerEvents="none" zIndexRange={[10, 0]}>
            <div style={{ borderRadius: 3, overflow: "hidden" }}>{screen}</div>
          </Html>
        </group>
      </group>
    </group>
  );
}
