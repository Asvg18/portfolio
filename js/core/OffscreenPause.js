export class OffscreenPause {
  #observer;

  constructor(elements, { margin = "100% 0px" } = {}) {
    this.#observer = new IntersectionObserver(
      (entries) => entries.forEach(({ target, isIntersecting }) => target.classList.toggle("is-idle", !isIntersecting)),
      { rootMargin: margin },
    );
    elements.filter(Boolean).forEach((element) => this.#observer.observe(element));
  }
}
