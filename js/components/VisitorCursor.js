const ZONES = "#home, #about, #projects, #certifications, #resume, #contact";
const ACTIVE_CLASS = "has-vcursor";

export class VisitorCursor {
  #element;
  #root = document.documentElement;
  #finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  #listeners = null;
  #x = 0;
  #y = 0;
  #frame = 0;
  #stale = false;
  #inside = false;
  #native = true;

  constructor(element) {
    this.#element = element;
  }

  start() {
    this.#finePointer.addEventListener("change", () => this.#sync());
    this.#sync();
  }

  #sync() {
    if (this.#finePointer.matches) this.#enable();
    else this.#disable();
  }

  #enable() {
    if (this.#listeners) return;
    this.#listeners = new AbortController();
    const options = { signal: this.#listeners.signal, passive: true };
    document.addEventListener("pointermove", (event) => this.#move(event), options);
    document.addEventListener("pointerover", (event) => this.#over(event), options);
    document.addEventListener("pointerdown", (event) => this.#press(event, true), options);
    document.addEventListener("pointerup", (event) => this.#press(event, false), options);
    this.#root.addEventListener("pointerleave", () => this.#leave(), options);
    window.addEventListener("blur", () => this.#leave(), options);
    window.addEventListener("scroll", () => this.#schedule(true), options);
  }

  #disable() {
    this.#listeners?.abort();
    this.#listeners = null;
    this.#leave();
    this.#root.classList.remove(ACTIVE_CLASS);
  }

  #move(event) {
    if (event.pointerType !== "mouse") {
      this.#root.classList.remove(ACTIVE_CLASS);
      this.#leave();
      return;
    }
    const activating = !this.#root.classList.contains(ACTIVE_CLASS);
    this.#root.classList.add(ACTIVE_CLASS);
    this.#x = event.clientX;
    this.#y = event.clientY;
    this.#inside = true;
    this.#schedule(activating);
  }

  #over(event) {
    if (event.pointerType !== "mouse") return;
    this.#inspect(event.target);
    this.#schedule(false);
  }

  #press(event, isDown) {
    if (event.pointerType !== "mouse") return;
    this.#element.classList.toggle("is-pressing", isDown);
    this.#schedule(true);
  }

  #leave() {
    this.#inside = false;
    this.#element.classList.remove("is-on", "is-pressing");
  }

  #inspect(target) {
    if (!(target instanceof Element)) return;
    const zone = target.closest(ZONES);
    if (zone) this.#element.dataset.zone = zone.id;
    this.#native = !this.#root.classList.contains(ACTIVE_CLASS) || getComputedStyle(target).cursor !== "none";
  }

  #schedule(stale) {
    this.#stale ||= stale;
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      if (this.#stale && this.#inside) this.#inspect(document.elementFromPoint(this.#x, this.#y));
      this.#stale = false;
      this.#element.style.transform = `translate3d(${this.#x}px, ${this.#y}px, 0)`;
      this.#element.classList.toggle("is-on", this.#inside && !this.#native);
    });
  }
}
