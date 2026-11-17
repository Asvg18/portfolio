import { prefersReducedMotion } from "../core/motion.js";

const HOLD_MS = 1800;
const GAP_MS = 900;
const LOOP_REST_MS = 2600;
const VISIBLE_RATIO = 0.5;

export class FolderTour {
  #strip;
  #ids;
  #index = 0;
  #timer = 0;
  #started = false;
  #visible = false;
  #lit = false;

  static isWanted() {
    return matchMedia("(hover: none)").matches && !prefersReducedMotion();
  }

  constructor(strip, nav) {
    this.#strip = strip;
    this.#ids = strip.ids;
    new IntersectionObserver(([entry]) => {
      this.#visible = entry.intersectionRatio >= VISIBLE_RATIO;
      this.#sync();
    }, { threshold: [0, VISIBLE_RATIO] }).observe(nav);
    document.addEventListener("visibilitychange", () => this.#sync());
  }

  start() {
    this.#started = true;
    this.#sync();
  }

  get #canPlay() {
    return this.#started && this.#visible && !document.hidden;
  }

  #sync() {
    if (this.#canPlay) {
      if (!this.#timer) this.#timer = setTimeout(() => this.#show(), GAP_MS);
      return;
    }
    clearTimeout(this.#timer);
    this.#timer = 0;
    if (this.#lit) this.#hide(false);
  }

  #show() {
    this.#lit = true;
    this.#strip.spotlight(this.#ids[this.#index]);
    this.#timer = setTimeout(() => this.#hide(true), HOLD_MS);
  }

  #hide(advance) {
    this.#lit = false;
    this.#strip.spotlight(null);
    if (!advance) return;
    this.#index = (this.#index + 1) % this.#ids.length;
    this.#timer = setTimeout(() => this.#show(), this.#index === 0 ? LOOP_REST_MS : GAP_MS);
  }
}
