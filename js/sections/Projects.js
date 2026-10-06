import { $, $$ } from "../core/dom.js";
import { prefersReducedMotion } from "../core/motion.js";
import { CommentPin } from "../components/CommentPin.js";

const GLIDE_MS = 1180;
const PRESS_MS = 160;
const RISE_SECONDS = 0.7;

export class Projects {
  #list;
  #cursor;
  #cards;
  #pins;
  #arrived = new Set();
  #target = null;
  #pickTimer = 0;
  #moving = false;
  #scrollFrame = 0;

  constructor(section, canvas) {
    this.#list = $(".pj-list", section);
    this.#cursor = $("#pjCursor", section);
    this.#cards = $$(".pj", section);
    this.#pins = $$(".pj-comment", section).map((element) => new CommentPin(element, {
      onOpen: (opened) => this.#closePins((pin) => pin !== opened),
    }));

    document.addEventListener("pointerdown", (event) => this.#closePins((pin) => !pin.contains(event.target)));
    canvas.addEventListener("reveal", ({ detail }) => this.#onReveal(detail));
    canvas.addEventListener("reset", ({ detail }) => {
      if (detail.section === section) this.#reset();
    });
    window.addEventListener("scroll", () => {
      if (this.#scrollFrame) return;
      this.#scrollFrame = requestAnimationFrame(() => {
        this.#scrollFrame = 0;
        this.#follow();
      });
    }, { passive: true });
    window.addEventListener("resize", () => {
      if (this.#target && !this.#moving) this.#place(this.#target, true);
    });
  }

  #onReveal({ block, delay }) {
    if (!this.#cards.includes(block)) return;
    setTimeout(() => {
      if (!block.classList.contains("is-in")) return;
      this.#arrived.add(block);
      this.#follow();
    }, (delay + RISE_SECONDS) * 1000);
  }

  #reset() {
    this.#arrived.clear();
    this.#target = null;
    clearTimeout(this.#pickTimer);
    this.#pick(null);
    this.#cursor.classList.remove("is-on", "is-parked", "is-pressing");
    this.#closePins();
  }

  #closePins(shouldClose = () => true) {
    this.#pins.filter(shouldClose).forEach((pin) => pin.toggle(false));
  }

  #follow() {
    if (!this.#arrived.size) return;
    const middle = window.innerHeight / 2;
    let closest = null;
    let closestDistance = Infinity;
    this.#cards.forEach((card) => {
      if (!this.#arrived.has(card)) return;
      const rect = card.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.bottom) / 2 - middle);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = card;
      }
    });
    if (closest) this.#goTo(closest);
  }

  #goTo(card) {
    if (card === this.#target) return;
    const first = !this.#target;
    const reduced = prefersReducedMotion();
    this.#target = card;
    clearTimeout(this.#pickTimer);
    this.#cursor.classList.remove("is-parked", "is-pressing");
    this.#pick(null);
    if (first || reduced) {
      const point = this.#restPoint(card);
      this.#cursor.classList.add("is-instant");
      this.#setPosition(point.x + 140, point.y + 90);
      this.#cursor.getBoundingClientRect();
      this.#cursor.classList.add("is-on");
    }
    requestAnimationFrame(() => {
      this.#place(card, reduced);
      this.#moving = !reduced;
      this.#pickTimer = setTimeout(() => {
        this.#moving = false;
        if (this.#target !== card) return;
        this.#cursor.classList.add("is-pressing");
        this.#pickTimer = setTimeout(() => {
          this.#cursor.classList.remove("is-pressing");
          this.#pick(card);
          this.#cursor.classList.add("is-parked");
        }, PRESS_MS);
      }, reduced ? 0 : GLIDE_MS);
    });
  }

  #restPoint(card) {
    const shot = $(".pj-shot", card);
    const anchorX = parseFloat(card.dataset.cx) || 0.5;
    const anchorY = parseFloat(card.dataset.cy) || 0.5;
    const list = this.#list.getBoundingClientRect();
    const rect = shot.getBoundingClientRect();
    return { x: rect.left - list.left + shot.offsetWidth * anchorX, y: rect.top - list.top + shot.offsetHeight * anchorY };
  }

  #place(card, instant) {
    const point = this.#restPoint(card);
    this.#cursor.classList.toggle("is-instant", Boolean(instant));
    this.#setPosition(point.x, point.y);
  }

  #setPosition(x, y) {
    this.#cursor.style.setProperty("--x", `${x.toFixed(1)}px`);
    this.#cursor.style.setProperty("--y", `${y.toFixed(1)}px`);
  }

  #pick(card) {
    this.#cards.forEach((candidate) => candidate.classList.toggle("is-picked", candidate === card));
  }
}
