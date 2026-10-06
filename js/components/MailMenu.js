import { $, $$ } from "../core/dom.js";
import { prefersReducedMotion } from "../core/motion.js";

const HIDE_AFTER_MS = 200;
const COPY_FOLD_MS = 850;
const MAIL_APP_TIMEOUT_MS = 1400;

export class MailMenu {
  #box;
  #button;
  #menu;
  #items;
  #toast;
  #open = false;
  #hideTimer = 0;
  #foldTimer = 0;

  constructor(box, toast) {
    this.#box = box;
    this.#button = $(".tb-mail", box);
    this.#menu = $(".mm", box);
    this.#toast = toast;
    if (matchMedia("(pointer: coarse)").matches) {
      this.#menu.insertBefore($('[data-mail="app"]', this.#menu), $(".mm-item", this.#menu));
    }
    this.#items = $$(".mm-item", this.#menu);
    this.#bind();
  }

  #bind() {
    this.#button.addEventListener("click", (event) => this.#setOpen(!this.#open, event.detail === 0 ? "first" : null));
    this.#button.addEventListener("keydown", (event) => this.#onButtonKey(event));
    this.#menu.addEventListener("keydown", (event) => this.#onMenuKey(event));
    this.#box.addEventListener("focusout", (event) => {
      if (this.#open && !this.#box.contains(event.relatedTarget)) this.#setOpen(false);
    });
    document.addEventListener("pointerdown", (event) => {
      if (this.#open && !this.#box.contains(event.target)) this.#setOpen(false);
    });
    this.#items.forEach((item) => item.addEventListener("click", () => this.#onChoose(item)));
  }

  #setOpen(open, focus) {
    if (open === this.#open) {
      if (open && focus) this.#focusItem(focus);
      return;
    }
    this.#open = open;
    clearTimeout(this.#hideTimer);
    this.#button.setAttribute("aria-expanded", String(open));
    this.#box.classList.toggle("is-open", open);
    if (open) {
      clearTimeout(this.#foldTimer);
      this.#menu.hidden = false;
      void this.#menu.offsetWidth;
      this.#menu.classList.add("is-on");
      if (focus) this.#focusItem(focus);
    } else {
      if (this.#menu.contains(document.activeElement)) this.#button.focus({ preventScroll: true });
      this.#menu.classList.remove("is-on");
      this.#hideTimer = setTimeout(() => {
        if (!this.#open) this.#menu.hidden = true;
      }, prefersReducedMotion() ? 0 : HIDE_AFTER_MS);
    }
  }

  #focusItem(which) {
    this.#items[which === "last" ? this.#items.length - 1 : 0].focus();
  }

  #onButtonKey(event) {
    if (event.key === "Escape" && this.#open) {
      event.preventDefault();
      this.#setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.#setOpen(true, event.key === "ArrowUp" ? "last" : "first");
    }
  }

  #onMenuKey(event) {
    const index = this.#items.indexOf(document.activeElement);
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: this.#items.length - 1 }[event.key];
    if (target !== undefined) {
      event.preventDefault();
      this.#items[(target + this.#items.length) % this.#items.length].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.#setOpen(false);
      this.#button.focus();
    } else if (event.key === "Tab") {
      this.#setOpen(false);
    }
  }

  #onChoose(item) {
    clearTimeout(this.#foldTimer);
    if (item.hasAttribute("data-copy")) {
      this.#foldTimer = setTimeout(() => this.#setOpen(false), prefersReducedMotion() ? 400 : COPY_FOLD_MS);
      return;
    }
    this.#setOpen(false);
    if (item.dataset.mail === "app") this.#watchMailApp();
  }

  #watchMailApp() {
    let answered = false;
    const onBlur = () => {
      answered = true;
    };
    window.addEventListener("blur", onBlur, { once: true });
    setTimeout(() => {
      window.removeEventListener("blur", onBlur);
      if (!answered && !document.hidden && document.hasFocus()) {
        this.#toast.show("No mail app opened on this device. Try Gmail or Outlook, or copy the address.");
      }
    }, MAIL_APP_TIMEOUT_MS);
  }
}
