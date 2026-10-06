import { $, $$, splitWords } from "../core/dom.js";
import { prefersReducedMotion, waitForFonts } from "../core/motion.js";

const CANVAS_FONTS = ['700 49px "Alte Haas Grotesk"', '400 148px "Relationship of Melodrame"'];
const FLICK_SPEED = 2.5;
const FLICK_REACH = 0.75;
const COMPACT_TEMPO = 1.6;
const HEADER_LEAD = { regular: 0.62, compact: 0.3 };
const BLOCK_STAGGER = 0.09;
const HEADER_THRESHOLD = 0.3;
const BLOCK_THRESHOLD = 0.12;

export class Canvas extends EventTarget {
  #root;
  #switcher;
  #sections;
  #compact = matchMedia("(max-width: 699px), (pointer: coarse) and (max-width: 1099px)");
  #ready = false;
  #navigating = false;
  #scrollFrame = 0;
  #resizeTimer = 0;
  #speed = 0;
  #direction = 1;
  #lastY = window.scrollY;
  #lastTime = performance.now();

  constructor(root, switcher) {
    super();
    this.#root = root;
    this.#switcher = switcher;
    $$(".sec-statement", root).forEach((statement) => splitWords(statement));
    $$(".tags", root).forEach((list) => $$("li", list).forEach((item, index) => item.style.setProperty("--k", index)));
    this.#sections = $$(".sec", root).map((element) => ({
      element,
      header: $(".sec-head", element),
      blocks: $$("[data-reveal]", element),
      startedAt: 0,
    }));
    this.#observe();
    document.addEventListener("click", (event) => this.#onLinkClick(event));
    window.addEventListener("scroll", () => {
      if (!this.#scrollFrame) this.#scrollFrame = requestAnimationFrame(() => this.#onScroll());
    }, { passive: true });
    window.addEventListener("resize", () => {
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = setTimeout(() => {
        this.#switcher.refresh();
        this.#onScroll();
        this.#sync();
      }, 100);
    });
  }

  get sections() {
    return this.#sections.map(({ element }) => element);
  }

  async start() {
    this.#onScroll();
    await waitForFonts(CANVAS_FONTS, 1400);
    this.#switcher.refresh();
    this.#ready = true;
    this.#sync();
  }

  #observe() {
    const arrival = new IntersectionObserver(() => this.#sync(), { threshold: [0, 0.12, 0.3, 0.6] });
    this.#sections.forEach(({ header, blocks }) => [header, ...blocks].forEach((element) => arrival.observe(element)));
    const departure = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const section = this.#sections.find(({ element }) => element === entry.target);
      if (section && !entry.isIntersecting && entry.boundingClientRect.top > 0) this.#reset(section);
    }), { rootMargin: "0px 0px -2px 0px" });
    this.#sections.forEach(({ element }) => departure.observe(element));
  }

  #sync() {
    if (!this.#ready || this.#navigating) return;
    const now = performance.now();
    const reach = this.#speed > FLICK_SPEED ? window.innerHeight * FLICK_REACH : 0;
    const lead = this.#compact.matches ? HEADER_LEAD.compact : HEADER_LEAD.regular;
    this.#sections.forEach((section) => {
      const { element, header, blocks } = section;
      if (!section.startedAt && (this.#visibleShare(header, reach) > HEADER_THRESHOLD || header.getBoundingClientRect().bottom < 0)) {
        section.startedAt = now;
        element.classList.add("is-on");
        this.#switcher.show();
        this.#quicken(element);
      }
      const elapsed = section.startedAt ? (now - section.startedAt) / 1000 : Infinity;
      const headerInView = this.#visibleShare(header) > HEADER_THRESHOLD;
      let order = 0;
      blocks.forEach((block) => {
        if (block.classList.contains("is-in") || this.#visibleShare(block, reach) < BLOCK_THRESHOLD) return;
        const wait = headerInView && elapsed < lead ? lead - elapsed : 0.05;
        this.#reveal(block, wait + order++ * BLOCK_STAGGER);
      });
    });
  }

  #reveal(block, delay) {
    block.style.setProperty("--d", `${delay.toFixed(2)}s`);
    block.classList.add("is-in");
    this.#quicken(block);
    this.dispatchEvent(new CustomEvent("reveal", { detail: { block, delay } }));
  }

  #reset(section) {
    if (!section.startedAt) return;
    section.startedAt = 0;
    section.element.classList.remove("is-on");
    section.blocks.forEach((block) => block.classList.remove("is-in"));
    this.dispatchEvent(new CustomEvent("reset", { detail: { section: section.element } }));
    if (section === this.#sections[0]) this.#switcher.hide();
  }

  #quicken(element) {
    if (!this.#compact.matches || prefersReducedMotion()) return;
    element.getAnimations({ subtree: true }).forEach((animation) => {
      const timing = animation.effect?.getTiming();
      if (timing && timing.iterations !== Infinity && animation.playbackRate === 1) animation.playbackRate = COMPACT_TEMPO;
    });
  }

  #visibleShare(element, reach = 0) {
    const rect = element.getBoundingClientRect();
    const viewport = window.innerHeight;
    const top = this.#direction < 0 ? -reach : 0;
    const bottom = this.#direction > 0 ? viewport + reach : viewport;
    const visible = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
    return visible <= 0 ? 0 : visible / Math.min(rect.height, viewport);
  }

  #trackSpeed() {
    const y = window.scrollY;
    const time = performance.now();
    if (y !== this.#lastY) this.#direction = Math.sign(y - this.#lastY);
    this.#speed = this.#speed * 0.5 + (Math.abs(y - this.#lastY) / Math.max(time - this.#lastTime, 1)) * 0.5;
    this.#lastY = y;
    this.#lastTime = time;
  }

  #onScroll() {
    this.#scrollFrame = 0;
    this.#trackSpeed();
    if (this.#speed > FLICK_SPEED) this.#sync();
    this.#switcher.syncPin(this.#root.getBoundingClientRect().top);
    const line = window.innerHeight * 0.33;
    const current = this.#sections.findLast(({ element }) => element.getBoundingClientRect().top <= line) || this.#sections[0];
    this.#switcher.setCurrent(current.element.id);
  }

  #onLinkClick(event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const section = this.#sections.find(({ element }) => `#${element.id}` === link.getAttribute("href"));
    if (!section) return;
    event.preventDefault();
    this.#goTo(section);
  }

  #goTo(section) {
    const top = Math.round(section.element.getBoundingClientRect().top + window.scrollY);
    const arrive = () => {
      if (!this.#navigating) return;
      this.#navigating = false;
      window.removeEventListener("scrollend", arrive);
      section.element.focus({ preventScroll: true });
      this.#sync();
    };
    this.#navigating = true;
    if (prefersReducedMotion() || Math.abs(window.scrollY - top) < 2) {
      window.scrollTo(0, top);
      arrive();
      return;
    }
    window.addEventListener("scrollend", arrive);
    setTimeout(arrive, 1600);
    window.scrollTo({ top, behavior: "smooth" });
  }
}
