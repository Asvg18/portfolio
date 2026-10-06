import { $, $$ } from "../core/dom.js";
import { clamp } from "../core/motion.js";

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5];

export class Resume {
  #paper;
  #readout;
  #buttons;
  #level = ZOOM_LEVELS.indexOf(1);

  constructor(section) {
    this.#paper = $("#rsPaper", section);
    this.#readout = $("#rsZoom", section);
    this.#buttons = $$("[data-zoom]", section);
    this.#buttons.forEach((button) => {
      button.addEventListener("click", () => this.#setLevel(this.#level + Number(button.dataset.zoom)));
    });
    this.#setLevel(this.#level);
  }

  #setLevel(level) {
    this.#level = clamp(level, 0, ZOOM_LEVELS.length - 1);
    const zoom = ZOOM_LEVELS[this.#level];
    this.#paper.style.setProperty("--z", zoom);
    this.#readout.textContent = `${Math.round(zoom * 100)}%`;
    this.#buttons.forEach((button) => {
      const atEnd = Number(button.dataset.zoom) < 0 ? this.#level === 0 : this.#level === ZOOM_LEVELS.length - 1;
      button.setAttribute("aria-disabled", String(atEnd));
    });
  }
}
