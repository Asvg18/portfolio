import { $ } from "../core/dom.js";

const CONFIRM_MS = 1800;

export class CopyButton {
  #button;
  #toast;
  #icon;
  #iconHref;
  #tip;
  #label;
  #labelText;
  #timer = 0;

  constructor(button, toast) {
    this.#button = button;
    this.#toast = toast;
    this.#icon = $("use", button);
    this.#iconHref = this.#icon.getAttribute("href");
    this.#tip = button.dataset.tip;
    this.#label = $("[data-done]", button);
    this.#labelText = this.#label?.textContent;
    button.addEventListener("click", () => this.copy());
  }

  async copy() {
    const value = this.#button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      this.#toast.show(value);
      return;
    }
    this.#toast.show(this.#button.dataset.copied || "Copied");
    this.#confirm(true);
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#confirm(false), CONFIRM_MS);
  }

  #confirm(copied) {
    this.#button.classList.toggle("is-copied", copied);
    this.#icon.setAttribute("href", copied ? "#i-check" : this.#iconHref);
    if (this.#tip) this.#button.dataset.tip = copied ? "Copied!" : this.#tip;
    if (this.#label) this.#label.textContent = copied ? this.#label.dataset.done : this.#labelText;
  }
}
