"use client";

import { useEffect, useState } from "react";

/**
 * Removes a flat background from an image in the browser (a simple chroma key).
 * The key colour is sampled from the top-left corner; pixels close to it become transparent,
 * with a soft edge. Returns a data URL, or the original src until processing finishes.
 */
export function useCutout(src: string, tolerance = 70, softness = 40): string {
  const [out, setOut] = useState(src);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        const [kr, kg, kb] = [px[0], px[1], px[2]];
        for (let i = 0; i < px.length; i += 4) {
          const d = Math.sqrt((px[i] - kr) ** 2 + (px[i + 1] - kg) ** 2 + (px[i + 2] - kb) ** 2);
          if (d < tolerance) px[i + 3] = 0;
          else if (d < tolerance + softness) px[i + 3] = Math.round(((d - tolerance) / softness) * 255);
        }
        ctx.putImageData(data, 0, 0);
        if (!cancelled) setOut(canvas.toDataURL("image/png"));
      } catch {
        // Keep the original image if the canvas can't be read
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, tolerance, softness]);

  return out;
}
