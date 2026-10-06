import { $, $$ } from "../core/dom.js";

export class SectionSwitcher {
  #rail;
  #nav;
  #glide;
  #scroller;
  #items;
  #current;
  #pointing = false;

  constructor(rail) {
    this.#rail = rail;
    this.#nav = $(".pagenav", rail);
    this.#glide = $(".pn-glide", rail);
    this.#scroller = $(".pn-scroll", rail);
    this.#items = $$(".pn-item", rail);
    this.#current = $(".pn-item.is-current", rail) || this.#items[0];
    this.#items.forEach((item, index) => {
      item.style.setProperty("--k", index);
      item.addEventListener("pointerenter", () => {
        this.#pointing = true;
        this.#placeGlide(item);
      });
      item.addEventListener("focus", () => this.#placeGlide(item));
    });
    $(".pn-track", rail).addEventListener("pointerleave", () => {
      this.#pointing = false;
      this.#placeGlide(this.#current);
    });
    this.#nav.addEventListener("focusout", (event) => {
      if (!this.#nav.contains(event.relatedTarget)) this.#placeGlide(this.#current);
    });
    this.#scroller.addEventListener("scroll", () => this.#markOverflow(), { passive: true });
  }

  show() {
    this.#rail.classList.add("is-on");
  }

  hide() {
    this.#rail.classList.remove("is-on");
  }

  refresh() {
    this.#placeGlide(this.#current);
    this.#markOverflow();
  }

  syncPin(containerTop) {
    this.#nav.classList.toggle("is-stuck", this.#rail.getBoundingClientRect().top - containerTop > 1);
  }

  setCurrent(sectionId) {
    const item = this.#items.find((candidate) => candidate.dataset.sec === sectionId);
    if (!item || item === this.#current) return;
    this.#current.classList.remove("is-current");
    this.#current.removeAttribute("aria-current");
    this.#current = item;
    item.classList.add("is-current");
    item.setAttribute("aria-current", "true");
    if (!this.#pointing && !this.#nav.contains(document.activeElement)) this.#placeGlide(item);
  }

  #placeGlide(item) {
    this.#glide.style.setProperty("--gx", `${item.offsetLeft}px`);
    this.#glide.style.setProperty("--gw", `${item.offsetWidth}px`);
    this.#glide.style.setProperty("--gtint", item.style.getPropertyValue("--tint"));
  }

  #markOverflow() {
    const scroller = this.#scroller;
    scroller.classList.toggle("is-overflowing", scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 4);
  }
}
