import { $, $$, offsetWithin } from "../core/dom.js";
import { minimumJerk, prefersReducedMotion, random, sleep } from "../core/motion.js";

const CHAT_WIDTH = 270;
const NAME_TAG = "Aerron";

export class FigmaCursor {
  #element;
  #chat;
  #text;
  #stage;
  #lede;
  #metrics;
  #playground;
  #isVisible;
  #message;
  #position = { x: 0, y: 0 };
  #target = { x: 0, y: 0 };
  #rest = { x: 0, y: 0 };
  #token = 0;
  #mode = "off";
  #demoDone = false;
  #holdingPill = false;
  #tagTimer = 0;

  constructor(element, { stage, lede, metrics, playground, isVisible }) {
    this.#element = element;
    this.#chat = $("#fcChat", element);
    this.#text = $("#fcText", element);
    this.#stage = stage;
    this.#lede = lede;
    this.#metrics = metrics;
    this.#playground = playground;
    this.#isVisible = isVisible;
    const verb = matchMedia("(hover: none)").matches ? "tap" : "click";
    this.#message = `Drag or ${verb} the pills around!`;
  }

  get #active() {
    return this.#element.classList.contains("is-on");
  }

  get #physics() {
    return this.#playground.physics;
  }

  async enter() {
    const { width, unit } = this.#metrics;
    this.#computeRest();
    this.#jumpTo(width + 30, this.#rest.y + 140 * unit);
    this.#element.classList.add("is-on");
    this.#stopIdle();
    await this.#moveTo(this.#rest.x, this.#rest.y, 1150, { curve: 0.2, overshoot: 0.035, side: -1 });
    await sleep(160);
    await this.#typeChat(this.#message);
    await sleep(260);
    await this.#wiggle();
    await sleep(900);
    if (!this.#playground.touched && !this.#demoDone) {
      this.#demoDone = true;
      this.#demo();
    } else {
      this.#idle();
    }
  }

  showStatic() {
    this.#computeRest();
    this.#jumpTo(this.#rest.x, this.#rest.y);
    this.#text.textContent = this.#message;
    this.#chat.classList.add("is-open");
    this.#element.classList.add("is-on");
  }

  notePlay() {
    if (this.#holdingPill) this.#returnHome();
    clearTimeout(this.#tagTimer);
    this.#tagTimer = setTimeout(() => {
      this.#chat.classList.add("is-tag");
      this.#text.textContent = NAME_TAG;
    }, 2600);
  }

  tick(dt) {
    if (!this.#active) return;
    const easing = 1 - Math.exp(-dt / 38);
    this.#position.x += (this.#target.x - this.#position.x) * easing;
    this.#position.y += (this.#target.y - this.#position.y) * easing;
    this.#place();
    if (this.#holdingPill) this.#physics?.move("cursor", this.#position);
  }

  relayout() {
    if (!this.#active) return;
    this.#computeRest();
    if (prefersReducedMotion()) {
      this.#jumpTo(this.#rest.x, this.#rest.y);
    } else if (this.#mode === "idle") {
      this.#stopIdle();
      this.#moveTo(this.#rest.x, this.#rest.y, 500, { curve: 0.1, overshoot: 0 }).then(() => this.#idle());
    }
  }

  #place() {
    const { x, y } = this.#position;
    this.#element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  }

  #jumpTo(x, y) {
    this.#position = { x, y };
    this.#target = { x, y };
    this.#place();
  }

  #computeRest() {
    const { width, unit } = this.#metrics;
    const emojis = $$(".emo", this.#lede);
    const anchor = emojis[emojis.length - 1] || this.#lede;
    const anchorOffset = offsetWithin(anchor, this.#stage);
    const ledeOffset = offsetWithin(this.#lede, this.#stage);
    const root = document.documentElement;
    const narrow = width < 768 || root.clientHeight > root.clientWidth * 1.15;
    let x;
    let y;
    if (narrow) {
      x = width - CHAT_WIDTH - 40;
      y = ledeOffset.y + this.#lede.offsetHeight + 22;
    } else {
      x = Math.min(anchorOffset.x + anchor.offsetWidth + 64 * unit, width - CHAT_WIDTH - 46);
      y = anchorOffset.y + anchor.offsetHeight - 2 * unit;
    }
    this.#rest = { x: Math.max(12, x), y };
  }

  #moveTo(x, y, duration, { curve = 0.16, overshoot = 0.03, side = Math.random() < 0.5 ? -1 : 1 } = {}) {
    const token = ++this.#token;
    const start = { ...this.#target };
    const dx = x - start.x;
    const dy = y - start.y;
    const distance = Math.hypot(dx, dy) || 1;
    const control = {
      x: start.x + dx / 2 + (-dy / distance) * distance * curve * side,
      y: start.y + dy / 2 + (dx / distance) * distance * curve * side,
    };
    const reach = Math.min(distance * overshoot, 14);
    const past = { x: x + (dx / distance) * reach, y: y + (dy / distance) * reach };
    const settleDuration = overshoot > 0 ? 170 : 0;

    return new Promise((resolve) => {
      const begin = performance.now();
      const step = (now) => {
        if (token !== this.#token) {
          resolve(false);
          return;
        }
        const t = (now - begin) / duration;
        if (t < 1) {
          const s = minimumJerk(t);
          const a = (1 - s) * (1 - s);
          const b = 2 * (1 - s) * s;
          const c = s * s;
          this.#target.x = a * start.x + b * control.x + c * past.x;
          this.#target.y = a * start.y + b * control.y + c * past.y;
          requestAnimationFrame(step);
          return;
        }
        const settle = settleDuration ? (now - begin - duration) / settleDuration : 1;
        if (settle < 1) {
          const s = minimumJerk(settle);
          this.#target.x = past.x + (x - past.x) * s;
          this.#target.y = past.y + (y - past.y) * s;
          requestAnimationFrame(step);
          return;
        }
        this.#target.x = x;
        this.#target.y = y;
        resolve(true);
      };
      requestAnimationFrame(step);
    });
  }

  async #idle() {
    this.#mode = "idle";
    while (this.#mode === "idle") {
      await sleep(random(1300, 3100));
      if (this.#mode !== "idle") return;
      if (!this.#isVisible()) continue;
      const angle = random(0, Math.PI * 2);
      const radius = random(6, 30);
      const arrived = await this.#moveTo(
        this.#rest.x + Math.cos(angle) * radius,
        this.#rest.y + Math.sin(angle) * radius * 0.6,
        random(480, 900),
        { curve: random(0.04, 0.22), overshoot: random(0, 0.05) },
      );
      if (!arrived && this.#mode !== "idle") return;
      if (!this.#demoDone && !this.#playground.touched && this.#mode === "idle") {
        this.#demoDone = true;
        this.#demo();
        return;
      }
    }
  }

  #stopIdle() {
    this.#mode = "busy";
    this.#token++;
  }

  async #wiggle() {
    const { x, y } = this.#rest;
    const straight = { curve: 0, overshoot: 0 };
    for (let i = 0; i < 2; i++) {
      await this.#moveTo(x + 10, y - 3, 85, straight);
      await this.#moveTo(x - 8, y + 2, 85, straight);
    }
    await this.#moveTo(x, y, 140, straight);
  }

  async #typeChat(message) {
    this.#text.textContent = "";
    this.#chat.classList.remove("is-tag");
    this.#chat.classList.add("is-open", "is-typing");
    await sleep(420);
    for (const character of message) {
      this.#text.textContent += character;
      await sleep(character === " " ? random(70, 130) : random(26, 66));
    }
    await sleep(220);
    this.#chat.classList.remove("is-typing");
  }

  async #demo() {
    const physics = this.#physics;
    if (this.#playground.touched || !physics) {
      this.#idle();
      return;
    }
    this.#stopIdle();
    const { width, height, unit } = this.#metrics;
    const candidates = this.#playground.pills
      .filter(({ body, resize }) => body && !resize && body.position.x > width * 0.22 && body.position.x < width - 330 && body.position.y > height * 0.45)
      .map((pill) => ({ pill, distance: Math.hypot(pill.body.position.x - this.#rest.x, pill.body.position.y - this.#rest.y) }))
      .sort((a, b) => a.distance - b.distance);
    if (!candidates.length) {
      this.#idle();
      return;
    }
    const { pill } = candidates[0];
    const { body } = pill;
    const grabX = body.position.x + Math.sin(body.angle) * pill.height * 0.12;
    const grabY = body.position.y - Math.cos(body.angle) * pill.height * 0.12;
    await this.#moveTo(grabX, grabY, 820, { curve: 0.2, overshoot: 0.02 });
    if (this.#playground.touched) {
      this.#returnHome();
      return;
    }
    this.#element.classList.add("is-pressing");
    await sleep(140);
    physics.grab("cursor", pill, { ...this.#target });
    this.#holdingPill = true;
    const direction = grabX > width / 2 ? -1 : 1;
    await this.#moveTo(grabX + direction * 90 * unit, grabY - 170 * unit, 760, { curve: 0.22, overshoot: 0, side: direction });
    await this.#moveTo(grabX + direction * 120 * unit, grabY - 150 * unit, 260, { curve: 0.1, overshoot: 0 });
    this.#holdingPill = false;
    physics.release("cursor");
    this.#element.classList.remove("is-pressing");
    await sleep(500);
    this.#returnHome();
  }

  async #returnHome() {
    this.#holdingPill = false;
    this.#physics?.release("cursor");
    this.#element.classList.remove("is-pressing");
    await this.#moveTo(this.#rest.x, this.#rest.y, 900, { curve: 0.18, overshoot: 0.03 });
    this.#idle();
  }
}
