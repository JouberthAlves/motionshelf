import type { CSSProperties, ReactNode } from "react";
import type { DeviceKind } from "./screens";

// Aro de titânio: o mesmo degradê nos dois aparelhos.
const RIM = "linear-gradient(145deg,#4f5668 0%,#1b1e25 38%,#2c313c 66%,#596173 100%)";
// Reflexo no vidro, por cima da tela.
const GLARE = "linear-gradient(115deg,rgb(255 255 255/0.10) 0%,transparent 34%)";

/**
 * Moldura do aparelho em CSS: a reserva do modelo 3D (celular, sem GPU, movimento reduzido) e o que
 * aparece enquanto o three.js carrega. Inclinação leve com perspectiva e, com `float`, uma flutuação
 * lenta. Sem GPU a flutuação fica desligada: a CPU desenha o movimento de 1 em 1 px e ele dá trancos.
 */
export function CssDevice({
  kind,
  side = 0,
  float = false,
  children,
}: {
  kind: DeviceKind;
  side?: -1 | 0 | 1;
  float?: boolean;
  children: ReactNode;
}) {
  const tilt: CSSProperties =
    kind === "phone"
      ? { transform: `perspective(1400px) rotateY(${side * -12}deg) rotateX(3deg)` }
      : { transform: "perspective(1600px) rotateX(5deg)" };

  return (
    <div className={`${float ? "device-float " : ""}flex h-full w-full items-end justify-center pb-[3%]`}>
      <div style={tilt}>{kind === "phone" ? <Phone>{children}</Phone> : <Laptop>{children}</Laptop>}</div>
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative" style={{ width: 320, height: 540 }}>
      {/* botões laterais */}
      <span className="absolute top-[86px] left-0 h-[30px] w-[4px] rounded-l-sm" style={{ background: RIM }} />
      <span className="absolute top-[132px] left-0 h-[52px] w-[4px] rounded-l-sm" style={{ background: RIM }} />
      <span className="absolute top-[194px] left-0 h-[52px] w-[4px] rounded-l-sm" style={{ background: RIM }} />
      <span className="absolute top-[150px] right-0 h-[82px] w-[4px] rounded-r-sm" style={{ background: RIM }} />
      <div className="absolute inset-y-0 right-[5px] left-[5px] rounded-[46px] p-[2px]" style={{ background: RIM }}>
        <div className="h-full w-full rounded-[44px] bg-black p-[8px]">
          <div className="relative h-full w-full overflow-hidden rounded-[34px]">
            {children}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: GLARE }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Laptop({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center" style={{ width: 572 }}>
      <div className="rounded-t-[18px] p-[2px]" style={{ width: 548, height: 361, background: RIM }}>
        <div className="relative h-full w-full rounded-t-[16px] bg-black px-[12px] pt-[14px] pb-[18px]">
          <span aria-hidden="true" className="absolute top-[5px] left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-[#1d2230]" />
          <div className="relative h-full w-full overflow-hidden rounded-[3px]">
            {children}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: GLARE }} />
          </div>
        </div>
      </div>
      {/* base: a frente do teclado vista de cima, com o entalhe de abrir */}
      <div
        className="relative h-[16px] w-full rounded-b-[12px]"
        style={{ background: "linear-gradient(to bottom,#6a7284 0%,#3a404c 30%,#1c1f26 100%)" }}
      >
        <span className="absolute top-0 left-1/2 h-[6px] w-[96px] -translate-x-1/2 rounded-b-md bg-[#1c1f26]" />
      </div>
    </div>
  );
}
