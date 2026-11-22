"use client";

import React, { useEffect, useRef } from "react";

/**
 * Full-screen WebGL noodle field: glossy, wavy strands hanging and swaying like noodles lifted
 * from a bowl, in cream/wheat tones tinted with the Soft Club palette (mint, ice, lilac).
 * Pure fragment shader, no libraries. Transparent wherever there is no noodle, rendered at reduced
 * resolution, paused when the tab is hidden, and a single still frame for prefers-reduced-motion.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const NOODLE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;

// Sine-free hash: stable at low precision
float hash1(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

const int STRANDS = 28;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y;          // x in [0, aspect], y in [0, 1]
  float aspect = uRes.x / uRes.y;
  vec4 acc = vec4(0.0);                        // premultiplied colour, front-to-back

  for (int i = 0; i < STRANDS; i++) {
    float fi = float(i);
    float h1 = hash1(fi * 3.17 + 1.0);
    float h2 = hash1(fi * 5.71 + 7.0);
    float h3 = hash1(fi * 9.13 + 13.0);

    // Each noodle hangs from the top and sways; two sine layers make it wavy, not uniform
    float baseX = (fi + 0.5) / float(STRANDS) * aspect + (h1 - 0.5) * 0.12;
    float t = uTime * (0.25 + 0.35 * h2);
    // Ramen curl: a slow sway, a tight wave and a fine wiggle
    float f1 = 3.0 + h3 * 3.0;
    float f2 = 14.0 + h2 * 10.0;
    float f3 = f2 * 2.7;
    float a1 = 0.02 + h2 * 0.03;
    float a2 = 0.010 + h1 * 0.010;
    float a3 = a2 * 0.3;
    float p1 = uv.y * f1 + t * 1.4 + h1 * 6.283;
    float p2 = uv.y * f2 - t * 0.9 + h3 * 6.283;
    float p3 = uv.y * f3 + t * 0.6 + h2 * 6.283;
    // Sway grows toward the hanging end (bottom), like a lifted noodle
    float sway = 0.45 + 0.55 * (1.0 - uv.y);
    float x = baseX + sway * a1 * sin(p1) + a2 * sin(p2) + a3 * sin(p3);
    float dxdy = sway * a1 * f1 * cos(p1) + a2 * f2 * cos(p2) + a3 * f3 * cos(p3);
    float d = abs(uv.x - x) / sqrt(1.0 + dxdy * dxdy);

    float thick = 0.0075 + h3 * 0.0045;
    if (d > thick) continue;

    // Noodles have different lengths: fade out at the hanging end
    float len = 0.45 + 0.55 * h1;
    float endFade = smoothstep(1.0 - len - 0.05, 1.0 - len + 0.12, uv.y);
    if (endFade <= 0.0) continue;

    // Tube shading: rounded body, glossy highlight off-centre
    float r = d / thick;                         // 0 at centre, 1 at edge
    float edge = 1.0 - smoothstep(0.8, 1.0, r);
    float body = 0.3 + 0.7 * sqrt(max(0.0, 1.0 - r * r));   // darker rim, brighter middle
    float spec = pow(max(0.0, 1.0 - abs(r - 0.3) * 2.5), 8.0);

    vec3 wheat = mix(vec3(0.98, 0.80, 0.45), vec3(1.00, 0.90, 0.66), h2);  // ramen yellow
    vec3 tint = mix(vec3(0.49, 1.00, 0.77), vec3(0.79, 0.72, 1.00), h1);  // soft-club glow
    vec3 c = mix(wheat, tint, 0.18) * body + vec3(1.0) * spec * 0.6;

    float a = edge * endFade * 0.92;
    acc.rgb += (1.0 - acc.a) * c * a;
    acc.a += (1.0 - acc.a) * a;
  }

  vec2 q = gl_FragCoord.xy / uRes;
  float vignette = 1.0 - smoothstep(0.3, 1.15, length(q - vec2(0.5, 0.6)));
  gl_FragColor = acc * vignette;
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("NoodleBackdrop shader:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export const NoodleBackdrop: React.FC<{ opacity?: number }> = ({ opacity = 0.45 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A still frame (reduced motion) is drawn once, so the buffer must survive compositing
    const gl = canvas.getContext("webgl", {
      antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power", preserveDrawingBuffer: reduce,
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, NOODLE_FRAG);
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

    let raf = 0;
    const start = performance.now();
    gl.clearColor(0, 0, 0, 0);

    /** Draws one frame. */
    const render = (now: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (now - start) / 1000 + 12);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    /** Animation loop (not used for reduced motion). */
    const loop = (now: number) => {
      render(now);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    // Below native resolution: it's a soft background, and this keeps it cheap.
    // Resizing a canvas clears it, so every resize redraws a frame right away
    // (otherwise the single still frame used for reduced motion would vanish).
    const scale = 0.6;
    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * scale));
      const h = Math.max(1, Math.floor(window.innerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      }
      render(performance.now());
    };
    resize();
    window.addEventListener("resize", resize);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      // No loseContext(): a remount (and React's dev double-mount) reuses this canvas's context
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity }} />
      {/* Keeps text readable over the noodles */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(6,10,17,0.1) 0%, rgba(6,10,17,0.45) 55%, rgba(6,10,17,0.75) 100%)" }}
      />
    </>
  );
};
