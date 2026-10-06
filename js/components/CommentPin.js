import { $ } from "../core/dom.js";

export class CommentPin {
  #element;
  #button;

  constructor(element, { onOpen }) {
    this.#element = element;
    this.#button = $(".pj-pin", element);
    this.#button.addEventListener("click", () => {
      const open = !this.isOpen;
      if (open) onOpen(this);
      this.toggle(open);
    });
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      this.toggle(false);
      this.#button.focus();
    });
  }

  get isOpen() {
    return this.#element.classList.contains("is-open");
  }

  contains(node) {
    return this.#element.contains(node);
  }

  toggle(open) {
    this.#element.classList.toggle("is-open", open);
    this.#button.setAttribute("aria-expanded", String(open));
  }
}
