let cached: boolean | undefined;

/**
 * true quando o WebGL2 roda em GPU de verdade (não em renderização por software, como SwiftShader).
 * O teste cria um contexto WebGL, então roda uma vez só e o resultado fica guardado.
 */
export function hasGpu() {
  if (cached !== undefined) return cached;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return (cached = false);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return (cached = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer));
  } catch {
    return (cached = false);
  }
}
