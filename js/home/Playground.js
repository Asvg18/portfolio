import { $, $$, createElement, replayClass } from "../core/dom.js";
import { clamp, easeOut, prefersReducedMotion, EASE_IOS } from "../core/motion.js";
import { PlaygroundItem } from "./PlaygroundItem.js";

const CLICK_MAX_MS = 420;
const DRAG_THRESHOLD = 6;

export class Playground {
  #status;
  #words;
  #measurer;
  #physics = null;
  #nextWord;
  #onPlay;
  #stageRect;

  items;
  pills;
  touched = false;

  constructor(root, { status, words, stageRect, onPlay }) {
    this.#status = status;
    this.#words = words;
    this.#stageRect = stageRect;
    this.#onPlay = onPlay;
    this.#nextWord = words.length - 1;
    this.#measurer = createElement("span", { className: "pill-measure", attributes: { "aria-hidden": "true" } });
    root.append(this.#measurer);

    this.items = $$(".pill, .ball", root).map((element) => new PlaygroundItem(element));
    this.pills = this.items.filter((item) => item.isPill);
    this.pills.forEach((item) => {
      item.element.replaceChildren(createElement("span", { className: "pill-txt", text: words[item.wordIndex].label }));
      this.#paint(item);
    });
    this.items.forEach((item) => this.#bind(item));
  }

  get physics() {
    return this.#physics;
  }

  set physics(physics) {
    this.#physics = physics;
  }

  measure(item) {
    if (item.isPill) {
      item.width = this.#textWidth(this.#words[item.wordIndex].label);
      item.element.style.width = `${item.width}px`;
      item.height = item.element.offsetHeight;
    } else {
      item.width = item.height = item.element.offsetWidth;
    }
  }

  measureAll() {
    this.items.forEach((item) => this.measure(item));
  }

  stepResizes(now) {
    this.pills.forEach((item) => {
      const resize = item.resize;
      if (!resize) return;
      const t = clamp((now - resize.start) / resize.duration, 0, 1);
      const width = resize.from + (resize.to - resize.from) * easeOut(t);
      if (this.#physics) this.#physics.setWidth(item, width);
      else item.width = resize.to;
      if (t >= 1) item.resize = null;
    });
  }

  #textWidth(label) {
    this.#measurer.textContent = label;
    return Math.ceil(this.#measurer.getBoundingClientRect().width);
  }

  #paint(item) {
    const word = this.#words[item.wordIndex];
    item.element.style.setProperty("--c", word.color);
    if (word.ink) item.element.style.setProperty("--ci", word.ink);
    else item.element.style.removeProperty("--ci");
  }

  #notePlay() {
    if (this.touched) return;
    this.touched = true;
    this.#onPlay();
  }

  #swapWord(item) {
    const shown = new Set(this.pills.map((pill) => pill.wordIndex));
    let next = item.wordIndex;
    for (let step = 1; step <= this.#words.length; step++) {
      const candidate = (this.#nextWord + step) % this.#words.length;
      if (!shown.has(candidate)) {
        next = candidate;
        this.#nextWord = candidate;
        break;
      }
    }
    if (next === item.wordIndex) return;

    const label = this.#words[next].label;
    const fromWidth = item.width;
    const toWidth = this.#textWidth(label);
    item.wordIndex = next;
    this.#paint(item);
    item.element.style.width = `${toWidth}px`;
    this.#status.textContent = label;

    const oldText = $(".pill-txt", item.element);
    const newText = createElement("span", { className: "pill-txt", text: label });
    item.element.append(newText);
    if (prefersReducedMotion()) {
      oldText.remove();
    } else {
      const timing = { duration: 380, easing: EASE_IOS, fill: "both" };
      oldText.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-115%)", opacity: 0 }], timing);
      const removeOld = () => oldText.remove();
      newText.animate([{ transform: "translateY(115%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], timing).finished.then(removeOld, removeOld);
    }

    item.resize = { from: fromWidth, to: toWidth, start: performance.now(), duration: 320 };
    this.#physics?.hop(item, 0.7);
  }

  #bounce(item) {
    replayClass(item.element, "is-boing");
    setTimeout(() => item.element.classList.remove("is-boing"), 650);
    this.#physics?.hop(item, 1.2);
  }

  #toStage(event) {
    const rect = this.#stageRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #bind(item) {
    const { element } = item;
    let press = null;

    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!this.#physics || !item.body) return;
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
      this.#physics.grab(`pointer-${event.pointerId}`, item, this.#toStage(event));
      this.#notePlay();
    });

    element.addEventListener("pointermove", (event) => {
      if (!press || press.id !== event.pointerId) return;
      if (!press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_THRESHOLD) {
        press.moved = true;
        element.classList.add("is-dragging");
      }
      this.#physics.move(`pointer-${event.pointerId}`, this.#toStage(event));
    });

    const end = (event, cancelled) => {
      if (!press || press.id !== event.pointerId) return;
      const isClick = !cancelled && !press.moved && performance.now() - press.time < CLICK_MAX_MS;
      this.#physics.release(`pointer-${event.pointerId}`);
      element.classList.remove("is-dragging");
      press = null;
      if (!isClick) return;
      if (item.isPill) this.#swapWord(item);
      else this.#bounce(item);
    };
    element.addEventListener("pointerup", (event) => end(event, false));
    element.addEventListener("pointercancel", (event) => end(event, true));
    element.addEventListener("lostpointercapture", (event) => end(event, true));

    if (item.isPill) {
      element.addEventListener("click", (event) => {
        if (event.detail !== 0) return;
        this.#notePlay();
        this.#swapWord(item);
      });
    }
  }
}
