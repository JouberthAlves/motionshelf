// Fumaça do Rocket Launch: um fluido 2D na GPU (WebGL2), no método de fluidos estáveis (advecção,
// força, vorticidade, projeção). Duas "tintas": fumaça (canal R) e calor (canal G). O calor sobe e brilha
// laranja perto dos bocais; a fumaça é empurrada pelos jatos, bate no chão, se espalha e sobe devagar,
// enrolando com a turbulência. Mundo em px de CSS, y para cima, chão em y = 0.
//
// Sem GPU de verdade (renderização por software) ou sem WebGL2, createFluidSmoke devolve null e quem usa
// cai para a fumaça de sprites em 2D (createSpriteSmoke, mais abaixo).

export type Jet = {
  /** Bocal em px do container, y para cima a partir do chão. */
  x: number;
  y: number;
  /** Direção do jato (unitária), y para cima. */
  dx: number;
  dy: number;
  /** 0–1: força do jato agora. */
  power: number;
};

export type Smoke = {
  /** Avança a simulação dt segundos com estes jatos e desenha. */
  step: (dt: number, jets: Jet[]) => void;
  resize: (width: number, height: number) => void;
  clear: () => void;
  /** Quanto de fumaça ainda há na tela (0 = limpa): serve para saber quando parar o laço. */
  amount: () => number;
  dispose: () => void;
};

const MAX_JETS = 4;
const SIM = 96; // células no lado menor da grade de velocidade
const DYE = 2; // a tinta tem o dobro da resolução da velocidade
const PRESSURE_STEPS = 18;

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uWorld;
uniform vec2 uTexel;
`;

const NOISE = `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Curl de um ruído escalar: um campo de giro sem divergência, que faz a fumaça enrolar.
vec2 curl(vec2 p) {
  float e = 0.35;
  float a = noise(p + vec2(0.0, e));
  float b = noise(p - vec2(0.0, e));
  float c = noise(p + vec2(e, 0.0));
  float d = noise(p - vec2(e, 0.0));
  return vec2(a - b, d - c) / (2.0 * e);
}
`;

const JETS = `
uniform vec4 uJet[${MAX_JETS}];   // x, y, dx, dy
uniform float uPower[${MAX_JETS}];
uniform int uJets;
`;

const SHADERS = {
  // Leva o campo junto com a velocidade (semi-lagrangiano) e dissipa cada canal no seu ritmo.
  advect: `${HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float uDt;
uniform vec4 uKeep;
void main() {
  vec2 v = texture(uVelocity, vUv).xy;
  vec4 c = texture(uSource, vUv - uDt * v / uWorld) * uKeep;
  outColor = clamp(c, vec4(-4000.0), vec4(4000.0));
}`,
  // Empuxo do calor, turbulência onde há fumaça, atrito no chão e os jatos (entrada de velocidade).
  force: `${HEAD}
${NOISE}
${JETS}
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform float uDt;
uniform float uTime;
void main() {
  vec2 p = vUv * uWorld;
  vec2 v = texture(uVelocity, vUv).xy;
  vec2 d = texture(uDye, vUv).xy;
  float here = smoothstep(0.02, 0.5, d.x + d.y);
  vec2 q = p / 38.0;
  vec2 turb = curl(q + vec2(uTime * 0.23, -uTime * 0.31)) + 0.5 * curl(q * 2.3 + vec2(-uTime * 0.47, uTime * 0.29) + 7.0);
  v += turb * 2600.0 * here * uDt;
  // O calor sobe forte; a fumaça fria sobe devagar.
  v.y += (900.0 * d.y + 26.0 * d.x) * uDt;
  v /= 1.0 + 0.6 * uDt;
  // Rente ao chão o ar desliza para os lados e perde força aos poucos.
  v.x /= 1.0 + 1.2 * exp(-p.y / 14.0) * uDt;
  for (int i = 0; i < ${MAX_JETS}; i++) {
    if (i >= uJets) break;
    vec4 j = uJet[i];
    float pw = uPower[i];
    if (pw <= 0.0) continue;
    vec2 rel = p - j.xy;
    float along = dot(rel, j.zw);
    float across = dot(rel, vec2(-j.w, j.z));
    float len = 26.0 + 40.0 * pw;
    float width = 3.5 + max(along, 0.0) * 0.22;
    float w = exp(-across * across / (width * width)) * smoothstep(-3.0, 0.0, along) * (1.0 - smoothstep(len * 0.6, len, along));
    v = mix(v, j.zw * (520.0 + 900.0 * pw), clamp(w * (1.0 - exp(-uDt * 40.0)), 0.0, 1.0));
    // Onde o jato toca o chão ele se abre em leque para os lados; quanto mais perto o bocal, mais forte.
    if (j.w < -0.2) {
      float h = max(j.y, 0.0);
      float near = exp(-h / 40.0);
      float gx = j.x + j.z * (h / -j.w);
      float sx = 22.0 + h * 0.3;
      float kx = (p.x - gx) / (sx * 1.4);
      float ky = p.y / 16.0;
      float k = exp(-kx * kx - ky * ky);
      float side = clamp((p.x - gx) / sx, -1.0, 1.0);
      v += uDt * 5200.0 * pw * near * k * vec2(side, 0.25);
    }
  }
  outColor = vec4(v, 0.0, 1.0);
}`,
  // Põe fumaça e calor na boca de cada bocal.
  inject: `${HEAD}
${JETS}
uniform sampler2D uDye;
uniform float uDt;
void main() {
  vec2 p = vUv * uWorld;
  vec4 d = texture(uDye, vUv);
  for (int i = 0; i < ${MAX_JETS}; i++) {
    if (i >= uJets) break;
    vec4 j = uJet[i];
    float pw = uPower[i];
    if (pw <= 0.0) continue;
    // Ao longo do jato (uma cápsula), não só na boca: com o jato apontado para baixo, a advecção puxa ar
    // limpo de cima para a boca e apagava a fumaça antes de ela aparecer.
    vec2 rel = p - j.xy;
    float along = dot(rel, j.zw);
    float across = dot(rel, vec2(-j.w, j.z));
    float len = 10.0 + 22.0 * pw;
    float r = 3.0 + max(along, 0.0) * 0.25;
    float w = exp(-across * across / (r * r)) * smoothstep(-2.0, 2.0, along) * (1.0 - smoothstep(len * 0.7, len, along));
    // Perto do chão o jato bate na plataforma e levanta muito mais fumaça (a nuvem da ignição).
    float ground = 1.0 + 2.0 * exp(-j.y / 30.0);
    d.x += w * pw * 4.5 * ground * uDt;
    d.y += w * pw * 9.0 * uDt;
    // A nuvem nasce também no ponto de impacto no chão, onde o leque leva a fumaça para os lados.
    if (j.w < -0.2) {
      float h = max(j.y, 0.0);
      float gx = j.x + j.z * (h / -j.w);
      float kx = (p.x - gx) / (16.0 + h * 0.3);
      float ky = p.y / 7.0;
      d.x += exp(-kx * kx - ky * ky) * pw * exp(-h / 40.0) * 7.0 * uDt;
    }
  }
  // A parte alta clareia mais rápido, como fumaça que se espalha no céu: a volta de paraquedas aparece.
  d.x *= exp(-uDt * 0.9 * vUv.y);
  outColor = min(d, vec4(3.0));
}`,
  curl: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  // Devolve os redemoinhos pequenos que a grade apaga: a fumaça continua enrolando.
  vorticity: `${HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uDt;
void main() {
  float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= 22.0 * C;
  f.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + f * uDt;
  outColor = vec4(clamp(v, vec2(-3000.0), vec2(3000.0)), 0.0, 1.0);
}`,
  // Paredes e chão refletem: o jato que bate no chão vira para os lados.
  divergence: `${HEAD}
uniform sampler2D uVelocity;
uniform float uCell;
void main() {
  vec2 C = texture(uVelocity, vUv).xy;
  float L = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  if (vUv.x - uTexel.x < 0.0) L = -C.x;
  if (vUv.x + uTexel.x > 1.0) R = -C.x;
  if (vUv.y + uTexel.y > 1.0) T = -C.y;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  outColor = vec4(0.5 * (R - L + T - B) / uCell, 0.0, 0.0, 1.0);
}`,
  pressure: `${HEAD}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform float uCell;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float div = texture(uDivergence, vUv).x;
  outColor = vec4((L + R + T + B - div * uCell * uCell) * 0.25, 0.0, 0.0, 1.0);
}`,
  project: `${HEAD}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform float uCell;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  vec2 v = texture(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B) / uCell;
  if (vUv.y - uTexel.y < 0.0) v.y = max(v.y, 0.0);
  outColor = vec4(v, 0.0, 1.0);
}`,
  scale: `${HEAD}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  outColor = uValue * texture(uSource, vUv);
}`,
  // Fumaça iluminada de cima, com textura fina de ruído; o calor acende laranja por dentro.
  display: `${HEAD}
${NOISE}
uniform sampler2D uDye;
uniform float uTime;
uniform vec3 uTint;
void main() {
  vec4 d = texture(uDye, vUv);
  float s = max(d.x, 0.0);
  float h = max(d.y, 0.0);
  vec2 g = vec2(
    texture(uDye, vUv + vec2(uTexel.x, 0.0)).x - texture(uDye, vUv - vec2(uTexel.x, 0.0)).x,
    texture(uDye, vUv + vec2(0.0, uTexel.y)).x - texture(uDye, vUv - vec2(0.0, uTexel.y)).x);
  vec3 n = normalize(vec3(-g * 2.2, 1.0));
  float light = 0.62 + 0.45 * max(dot(n, normalize(vec3(-0.35, 0.8, 0.6))), 0.0);
  vec2 p = vUv * uWorld;
  float grain = 0.7 + 0.6 * noise(p / 7.0 + vec2(0.0, -uTime * 0.6)) * noise(p / 19.0 + vec2(uTime * 0.2, 0.0));
  float a = (1.0 - exp(-s * 1.5 * grain)) * 0.92;
  vec3 col = uTint * light;
  // Por baixo, a fumaça pega a luz quente da chama; o calor em si brilha (soma, sem cobrir).
  vec3 warm = vec3(1.0, 0.55, 0.22);
  col = mix(col, warm, clamp(h * 0.3, 0.0, 0.45));
  float glow = clamp(h * 0.6, 0.0, 1.0);
  outColor = vec4(col * a + warm * glow * 0.35, a + glow * 0.15);
}`,
} as const;

type Name = keyof typeof SHADERS;
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Pair = { read: Target; write: Target; swap: () => void };

/** true quando o WebGL roda em software (SwiftShader, llvmpipe…): aí o fluido ficaria lento demais. */
function software(gl: WebGL2RenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}

export function createFluidSmoke(canvas: HTMLCanvasElement, tint: [number, number, number]): Smoke | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  if (software(gl) || !gl.getExtension("EXT_color_buffer_float")) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vert = compile(gl.VERTEX_SHADER, VERT);
  const programs = {} as Record<Name, { prog: WebGLProgram; loc: (n: string) => WebGLUniformLocation | null }>;
  for (const name of Object.keys(SHADERS) as Name[]) {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, SHADERS[name]));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return null;
    }
    const cache = new Map<string, WebGLUniformLocation | null>();
    programs[name] = {
      prog,
      loc: (n) => {
        if (!cache.has(n)) cache.set(n, gl.getUniformLocation(prog, n));
        return cache.get(n)!;
      },
    };
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const targets: Target[] = [];
  const target = (w: number, h: number): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const t = { tex, fbo, w, h };
    targets.push(t);
    return t;
  };
  const pair = (w: number, h: number): Pair => {
    const p = { read: target(w, h), write: target(w, h), swap: () => ([p.read, p.write] = [p.write, p.read]) };
    return p;
  };

  let world: [number, number] = [1, 1];
  let velocity: Pair;
  let dye: Pair;
  let pressure: Pair;
  let divergence: Target;
  let curlT: Target;
  let time = 0;
  let presence = 0;

  const program = (name: Name, texel: Target) => {
    const p = programs[name];
    gl.useProgram(p.prog);
    gl.uniform2f(p.loc("uWorld"), world[0], world[1]);
    gl.uniform2f(p.loc("uTexel"), 1 / texel.w, 1 / texel.h);
    return p.loc;
  };
  const bind = (loc: (n: string) => WebGLUniformLocation | null, name: string, t: Target, unit: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(loc(name), unit);
  };
  const draw = (out: Target | null) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fbo : null);
    gl.viewport(0, 0, out ? out.w : gl.drawingBufferWidth, out ? out.h : gl.drawingBufferHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  const jetsUniform = (loc: (n: string) => WebGLUniformLocation | null, jets: Jet[]) => {
    const list = jets.slice(0, MAX_JETS);
    gl.uniform1i(loc("uJets"), list.length);
    if (!list.length) return;
    gl.uniform4fv(loc("uJet"), list.flatMap((j) => [j.x, j.y, j.dx, j.dy]));
    gl.uniform1fv(loc("uPower"), list.map((j) => j.power));
  };

  const resize = (width: number, height: number) => {
    for (const t of targets.splice(0)) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    world = [Math.max(width, 1), Math.max(height, 1)];
    // Células quadradas: o lado menor tem SIM células.
    const k = SIM / Math.min(world[0], world[1]);
    const sw = Math.max(8, Math.round(world[0] * k));
    const sh = Math.max(8, Math.round(world[1] * k));
    velocity = pair(sw, sh);
    pressure = pair(sw, sh);
    divergence = target(sw, sh);
    curlT = target(sw, sh);
    dye = pair(sw * DYE, sh * DYE);
    // Canvas em densidade 1: a fumaça é macia, e o custo do fluido não cresce com a tela.
    canvas.width = Math.round(world[0]);
    canvas.height = Math.round(world[1]);
  };

  const step = (dt: number, jets: Jet[]) => {
    time += dt;
    const cell = world[1] / velocity.read.h;
    gl.disable(gl.BLEND);

    let loc = program("force", velocity.read);
    bind(loc, "uVelocity", velocity.read, 0);
    bind(loc, "uDye", dye.read, 1);
    gl.uniform1f(loc("uDt"), dt);
    gl.uniform1f(loc("uTime"), time);
    jetsUniform(loc, jets);
    draw(velocity.write);
    velocity.swap();

    loc = program("curl", velocity.read);
    bind(loc, "uVelocity", velocity.read, 0);
    draw(curlT);
    loc = program("vorticity", velocity.read);
    bind(loc, "uVelocity", velocity.read, 0);
    bind(loc, "uCurl", curlT, 1);
    gl.uniform1f(loc("uDt"), dt);
    draw(velocity.write);
    velocity.swap();

    loc = program("divergence", velocity.read);
    bind(loc, "uVelocity", velocity.read, 0);
    gl.uniform1f(loc("uCell"), cell);
    draw(divergence);
    loc = program("scale", pressure.read);
    bind(loc, "uSource", pressure.read, 0);
    gl.uniform1f(loc("uValue"), 0.8);
    draw(pressure.write);
    pressure.swap();
    loc = program("pressure", pressure.read);
    bind(loc, "uDivergence", divergence, 1);
    gl.uniform1f(loc("uCell"), cell);
    for (let i = 0; i < PRESSURE_STEPS; i++) {
      bind(loc, "uPressure", pressure.read, 0);
      draw(pressure.write);
      pressure.swap();
    }
    loc = program("project", velocity.read);
    bind(loc, "uPressure", pressure.read, 0);
    bind(loc, "uVelocity", velocity.read, 1);
    gl.uniform1f(loc("uCell"), cell);
    draw(velocity.write);
    velocity.swap();

    loc = program("advect", velocity.read);
    gl.uniform1f(loc("uDt"), dt);
    bind(loc, "uVelocity", velocity.read, 0);
    bind(loc, "uSource", velocity.read, 1);
    gl.uniform4f(loc("uKeep"), 1, 1, 1, 1);
    draw(velocity.write);
    velocity.swap();

    loc = program("inject", dye.read);
    bind(loc, "uDye", dye.read, 0);
    gl.uniform1f(loc("uDt"), dt);
    jetsUniform(loc, jets);
    draw(dye.write);
    dye.swap();

    // A fumaça some em ~3 s (0,55/s) e o calor rápido (~3/s): na volta de paraquedas o botão já aparece.
    loc = program("advect", dye.read);
    gl.uniform1f(loc("uDt"), dt);
    bind(loc, "uVelocity", velocity.read, 0);
    bind(loc, "uSource", dye.read, 1);
    gl.uniform4f(loc("uKeep"), Math.exp(-0.55 * dt), Math.exp(-3 * dt), 1, 1);
    draw(dye.write);
    dye.swap();

    loc = program("display", dye.read);
    bind(loc, "uDye", dye.read, 0);
    gl.uniform1f(loc("uTime"), time);
    gl.uniform3f(loc("uTint"), tint[0], tint[1], tint[2]);
    gl.clearColor(0, 0, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    draw(null);

    // Estimativa barata de quanta fumaça resta: decai com a dissipação e sobe com a injeção.
    const injected = jets.reduce((sum, j) => sum + j.power, 0);
    presence = presence * Math.exp(-0.55 * dt) + injected * dt;
  };

  return {
    step,
    resize,
    clear() {
      for (const t of targets) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      presence = 0;
    },
    amount: () => presence,
    dispose() {
      for (const t of targets.splice(0)) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      }
      for (const { prog } of Object.values(programs)) gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteBuffer(quad);
    },
  };
}

// ---------- reserva sem GPU: nuvens de sprite em canvas 2D ----------

type Puff = { x: number; y: number; vx: number; vy: number; r: number; spin: number; rot: number; life: number; max: number; heat: number };

/** Sprite de nuvem: ruído fractal recortado por um degradê radial, gerado uma vez. */
function cloudSprite(size: number, tint: [number, number, number]) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rand = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smoothNoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = rand(ix, iy);
    const b = rand(ix + 1, iy);
    const cc = rand(ix, iy + 1);
    const d = rand(ix + 1, iy + 1);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      const r = Math.sqrt(nx * nx + ny * ny) * 2;
      let n = 0;
      let amp = 0.5;
      let f = 4;
      for (let o = 0; o < 4; o++) {
        n += amp * smoothNoise(x / size * f + o * 13.1, y / size * f + o * 7.7);
        amp *= 0.5;
        f *= 2;
      }
      const falloff = Math.max(0, 1 - r);
      const a = Math.max(0, Math.min(1, falloff * falloff * (0.35 + n * 1.1)));
      // Mais claro em cima, como se a luz viesse de cima.
      const shade = 0.78 + 0.32 * (0.5 - ny);
      const i = (y * size + x) * 4;
      img.data[i] = tint[0] * 255 * shade;
      img.data[i + 1] = tint[1] * 255 * shade;
      img.data[i + 2] = tint[2] * 255 * shade;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Fumaça de sprites em canvas 2D, para aparelho sem GPU de verdade. Mesma interface do fluido. */
export function createSpriteSmoke(canvas: HTMLCanvasElement, tint: [number, number, number]): Smoke {
  const ctx = canvas.getContext("2d")!;
  const sprite = cloudSprite(96, tint);
  const puffs: Puff[] = [];
  let width = 1;
  let height = 1;
  let debt = 0;

  return {
    resize(w, h) {
      width = Math.max(w, 1);
      height = Math.max(h, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    step(dt, jets) {
      for (const j of jets) {
        if (j.power <= 0.02) continue;
        debt += dt * 34 * j.power;
        while (debt >= 1 && puffs.length < 220) {
          debt -= 1;
          const speed = 160 + 320 * j.power * Math.random();
          puffs.push({
            x: j.x + (Math.random() - 0.5) * 6,
            y: j.y + j.dy * 6,
            vx: j.dx * speed + (Math.random() - 0.5) * 40,
            vy: j.dy * speed,
            r: 8 + Math.random() * 6,
            spin: (Math.random() - 0.5) * 1.2,
            rot: Math.random() * Math.PI * 2,
            life: 0,
            max: 1.8 + Math.random() * 1.6,
            heat: 1,
          });
        }
      }
      ctx.clearRect(0, 0, width, height);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life += dt;
        if (p.life > p.max) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Chão em y = 0 (y para cima): bate, abre para os lados e passa a subir devagar.
        if (p.y < p.r * 0.35) {
          p.y = p.r * 0.35;
          if (Math.abs(p.vx) < 80) p.vx += (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 140);
          p.vy = Math.abs(p.vy) * 0.08;
        }
        p.vx *= Math.exp(-1.4 * dt);
        p.vy = p.vy * Math.exp(-1.6 * dt) + 22 * dt;
        p.r += dt * (26 - p.life * 4);
        p.rot += p.spin * dt;
        p.heat = Math.max(0, p.heat - dt * 3);
        const k = p.life / p.max;
        const alpha = 0.5 * Math.min(1, p.life * 5) * (1 - k) * (1 - k);
        ctx.save();
        ctx.translate(p.x, height - p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, -p.r * 1.6, -p.r * 1.6, p.r * 3.2, p.r * 3.2);
        if (p.heat > 0.05) {
          // Logo na saída, a nuvem ainda está quente: brilho laranja por cima, somando luz.
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = p.heat * 0.35;
          ctx.fillStyle = "rgb(255,140,60)";
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      puffs.length = 0;
      ctx.clearRect(0, 0, width, height);
    },
    amount: () => puffs.length,
    dispose() {
      puffs.length = 0;
    },
  };
}
