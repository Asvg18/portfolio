import { $ } from "../core/dom.js";
import { prefersReducedMotion } from "../core/motion.js";

const RETRY_CUE_MS = 1800;
const SEEN_RATIO = 0.55;

export class Flashcard {
  #card;
  #flipButton;
  #flipLabel;
  #hint;
  #isActive;
  #flipped = false;
  #flippedByHand = false;
  #cueDue = false;
  #seen = false;
  #cueTimer = 0;

  constructor(card, { flipButton, hint, isActive }) {
    this.#card = card;
    this.#flipButton = flipButton;
    this.#flipLabel = $("span", flipButton);
    this.#hint = hint;
    this.#isActive = isActive;
    if (matchMedia("(hover: none)").matches) $("span", hint).textContent = "Tap to flip!";

    card.addEventListener("click", () => this.#flipByHand());
    flipButton.addEventListener("click", () => this.#flipByHand());
    card.addEventListener("animationend", (event) => {
      if (event.animationName === "peek") card.classList.remove("is-peeking");
    });
    new IntersectionObserver(([entry]) => {
      this.#seen = entry.intersectionRatio >= SEEN_RATIO;
      if (this.#seen && this.#cueDue) this.cueIn(RETRY_CUE_MS);
    }, { threshold: [0, SEEN_RATIO, 1] }).observe(card);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.#cueDue) this.cueIn(RETRY_CUE_MS);
    });
    if (matchMedia("(hover: hover)").matches) this.#bindTilt();
  }

  get element() {
    return this.#card;
  }

  cueIn(ms) {
    clearTimeout(this.#cueTimer);
    this.#cueTimer = setTimeout(() => this.#nudge(), ms);
  }

  reset() {
    clearTimeout(this.#cueTimer);
    this.#cueDue = false;
    this.#card.classList.remove("is-peeking");
    this.#hint.classList.remove("is-on");
    this.#setFlipped(false);
  }

  #flipByHand() {
    this.#flippedByHand = true;
    clearTimeout(this.#cueTimer);
    this.#card.classList.remove("is-peeking");
    this.#hint.classList.remove("is-on");
    this.#setFlipped(!this.#flipped);
  }

  #setFlipped(flipped) {
    this.#flipped = flipped;
    this.#card.classList.toggle("is-flipped", flipped);
    $(".pass-front", this.#card).setAttribute("aria-hidden", String(flipped));
    $(".pass-back", this.#card).setAttribute("aria-hidden", String(!flipped));
    this.#flipButton.setAttribute("aria-pressed", String(flipped));
    this.#flipLabel.textContent = flipped ? "Back to the pass" : "See the certificate";
  }

  #nudge() {
    this.#cueDue = false;
    if (this.#flippedByHand || this.#flipped || !this.#isActive()) return;
    if (document.hidden || !this.#seen) {
      this.#cueDue = true;
      return;
    }
    this.#hint.classList.add("is-on");
    if (!prefersReducedMotion()) this.#card.classList.add("is-peeking");
  }

  #bindTilt() {
    const card = this.#card;
    card.addEventListener("pointermove", (event) => {
      if (prefersReducedMotion()) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tx", `${(y * -7).toFixed(2)}deg`);
      card.style.setProperty("--ty", `${(x * 9).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    card.addEventListener("pointerleave", () => {
      ["--tx", "--ty", "--gx", "--gy"].forEach((property) => card.style.removeProperty(property));
    });
  }
}
