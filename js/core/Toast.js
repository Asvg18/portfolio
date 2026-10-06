export class Toast {
  #element;
  #duration;
  #timer = 0;

  constructor(element, { duration = 2800 } = {}) {
    this.#element = element;
    this.#duration = duration;
  }

  show(message) {
    this.#element.textContent = message;
    this.#element.classList.add("is-on");
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#element.classList.remove("is-on"), this.#duration);
  }
}
