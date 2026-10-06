import { $, $$ } from "./dom.js";

export class Marquee {
  static SPEED = 46;

  #track;
  #group;
  #builtFor = 0;

  constructor(track) {
    this.#track = track;
    this.#group = $(".marquee-group", track);
    window.addEventListener("resize", () => {
      if (window.innerWidth !== this.#builtFor) this.build();
    });
  }

  build() {
    this.#builtFor = window.innerWidth;
    $$(".marquee-group", this.#track).slice(1).forEach((group) => group.remove());
    const groupWidth = this.#group.getBoundingClientRect().width || 1;
    const perHalf = Math.max(1, Math.ceil((window.innerWidth + 40) / groupWidth));
    for (let i = 1; i < perHalf * 2; i++) this.#track.append(this.#group.cloneNode(true));
    this.#track.style.setProperty("--mq-dur", `${((groupWidth * perHalf) / Marquee.SPEED).toFixed(2)}s`);
  }
}
