import { $ } from "../core/dom.js";
import { prefersReducedMotion } from "../core/motion.js";
import { MarkerTool } from "../components/MarkerTool.js";

const COUNT_DURATION = 1100;

export class About {
  #figure;
  #target;
  #decimals;
  #timer = 0;
  #run = 0;

  constructor(section, canvas, { toast }) {
    this.#figure = $(".gwa-num", section);
    this.#target = parseFloat(this.#figure.dataset.count);
    this.#decimals = (this.#figure.dataset.count.split(".")[1] || "").length;
    canvas.addEventListener("reveal", ({ detail }) => {
      if (detail.block.contains(this.#figure)) this.#countUp(detail.delay + 0.4);
    });
    canvas.addEventListener("reset", ({ detail }) => {
      if (detail.section === section) this.#cancel();
    });
    new MarkerTool($(".ab-notes", section), toast);
  }

  #countUp(delay) {
    this.#cancel();
    const run = this.#run;
    if (prefersReducedMotion()) {
      this.#render(this.#target);
      return;
    }
    this.#render(0);
    this.#timer = setTimeout(() => {
      const start = performance.now();
      const step = (now) => {
        if (run !== this.#run) return;
        const t = Math.min(1, (now - start) / COUNT_DURATION);
        this.#render(this.#target * (1 - Math.pow(1 - t, 4)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay * 1000);
  }

  #cancel() {
    clearTimeout(this.#timer);
    this.#run++;
  }

  #render(value) {
    this.#figure.textContent = value.toFixed(this.#decimals);
  }
}
