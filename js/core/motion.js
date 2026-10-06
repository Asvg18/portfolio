const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export const prefersReducedMotion = () => reducedMotion.matches;

export const EASE_IOS = "cubic-bezier(0.32, 0.72, 0, 1)";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const random = (min, max) => min + Math.random() * (max - min);

export const easeOut = (t) => 1 - Math.pow(1 - t, 3.2);

export const minimumJerk = (t) => t * t * t * (10 - 15 * t + 6 * t * t);

export async function waitForFonts(descriptors, timeout) {
  if (!document.fonts?.load) return;
  const loads = Promise.all(descriptors.map((font) => document.fonts.load(font))).catch(() => {});
  await Promise.race([loads, sleep(timeout)]);
}
