"use client";

import React, { useEffect, useRef } from "react";

/**
 * Full-screen WebGL "digital rain" in the Soft Club palette (phosphor mint → ice blue → lilac).
 * Pure fragment shader, no libraries. Renders at reduced resolution, pauses when the tab is hidden,
 * and draws a single still frame for prefers-reduced-motion. If WebGL is unavailable it renders nothing
 * and the CSS gradient background shows through.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uCell;

// Sine-free hash (Dave Hoskins): stable at low precision, unlike fract(sin(x) * big)
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 grid = floor(frag / uCell);
  vec2 local = fract(frag / uCell);
  float col = grid.x;

  // Only some columns rain, each at its own speed and phase
  float active = step(0.42, hash(vec2(col, 3.0)));
  float speed = 3.0 + hash(vec2(col, 1.0)) * 9.0;
  float rows = uRes.y / uCell;
  float head = mod(uTime * speed + hash(vec2(col, 7.0)) * 200.0, rows + 40.0);
  float y = rows - grid.y;
  float d = head - y;
  float trail = (d >= 0.0 && d < 26.0) ? pow(1.0 - d / 26.0, 1.6) : 0.0;
  // smoothstep needs edge0 < edge1 (reversed edges are undefined in GLSL ES), so invert explicitly
  float headGlow = 1.0 - smoothstep(0.0, 1.2, abs(d));

  // Glyphs: a 4x6 pseudo-bitmap per cell that flickers over time
  float t = floor(uTime * (1.5 + hash(grid) * 5.0));
  vec2 g = floor(local * vec2(4.0, 6.0));
  float on = step(0.5, hash(grid * 1.3 + g * 0.71 + t * 0.37));
  float inside = step(0.14, local.x) * step(local.x, 0.86) * step(0.08, local.y) * step(local.y, 0.92);
  float glyph = on * inside;

  vec3 mint = vec3(0.49, 1.0, 0.77);
  vec3 ice = vec3(0.66, 0.85, 1.0);
  vec3 lilac = vec3(0.79, 0.72, 1.0);
  float hueMix = 0.5 + 0.5 * sin(col * 0.06 + uTime * 0.08);
  vec3 base = mix(mint, ice, hueMix);
  base = mix(base, lilac, smoothstep(0.55, 1.0, frag.y / uRes.y) * 0.6);

  float a = active * glyph * (trail * 0.6 + headGlow);
  vec3 c = base * a + vec3(1.0) * headGlow * glyph * active * 0.45;

  vec2 uv = frag / uRes;
  float vignette = 1.0 - smoothstep(0.25, 1.15, length(uv - vec2(0.5, 0.55)));
  // Premultiplied alpha: only lit glyphs paint; everything else stays transparent
  vec3 outc = c * vignette;
  float alpha = clamp(max(outc.r, max(outc.g, outc.b)), 0.0, 1.0);
  gl_FragColor = vec4(outc, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("MatrixRain shader:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export const MatrixRain: React.FC<{ opacity?: number }> = ({ opacity = 0.4 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uCell = gl.getUniformLocation(prog, "uCell");

    // Render below native resolution: it's a soft background, and this keeps it cheap
    const scale = 0.6;
    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * scale));
      const h = Math.max(1, Math.floor(window.innerHeight * scale));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uCell, Math.max(8, Math.round(15 * scale * (window.devicePixelRatio > 1 ? 1.1 : 1))));
    };
    resize();
    window.addEventListener("resize", resize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    gl.clearColor(0, 0, 0, 0);
    const draw = (now: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (now - start) / 1000 + 40);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      // Don't call loseContext() here: a remount (and React's dev double-mount) gets the same canvas
      // context back, and a lost context can't draw. The browser frees it with the canvas.
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
        style={{ opacity, imageRendering: "auto" }}
      />
      {/* Keeps text readable over the rain */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(6,10,17,0) 0%, rgba(6,10,17,0.35) 55%, rgba(6,10,17,0.7) 100%)" }}
      />
    </>
  );
};
