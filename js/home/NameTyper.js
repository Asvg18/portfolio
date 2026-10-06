import { $, $$ } from "../core/dom.js";
import { random, sleep } from "../core/motion.js";

const FRAME_WIDTH = 306;
const FRAME_HEIGHT = "125.18";

export class NameTyper {
  #text;
  #letters;
  #selection;
  #dimensions;
  #caret;
  #rotator;

  constructor(root) {
    this.#text = $("#nameText", root);
    this.#letters = $$(".ty", this.#text);
    this.#selection = $("#nameSel", root);
    this.#dimensions = $("#nameDims", root);
    this.#caret = $("#caret", root);
    this.#rotator = $("#nameRot", root);
  }

  showInstantly() {
    this.#letters.forEach((letter) => letter.classList.add("is-on"));
    this.#selection.classList.add("is-on");
    this.#rotator.classList.add("is-rotated");
  }

  async type() {
    const fullWidth = this.#text.offsetWidth;
    this.#selection.style.width = "2px";
    this.#setDimensions(1);
    this.#selection.classList.add("is-on");
    this.#caret.style.setProperty("--caret-x", "0px");
    this.#caret.classList.add("is-on");
    await sleep(300);
    for (const letter of this.#letters) {
      letter.classList.add("is-on");
      const width = letter.offsetLeft + letter.offsetWidth;
      this.#selection.style.width = `${width}px`;
      this.#caret.style.setProperty("--caret-x", `${width}px`);
      this.#setDimensions(Math.max(1, Math.round((FRAME_WIDTH * width) / fullWidth)));
      await sleep(random(52, 96));
    }
    this.#selection.style.width = "";
    this.#setDimensions(FRAME_WIDTH);
    await sleep(160);
    this.#caret.classList.remove("is-on");
    this.#rotator.classList.add("is-rotated");
  }

  #setDimensions(width) {
    this.#dimensions.textContent = `${width} × ${FRAME_HEIGHT}`;
  }
}
