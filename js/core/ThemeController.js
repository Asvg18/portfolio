import { prefersReducedMotion } from "./motion.js";

const STORAGE_KEY = "as-theme";

export class ThemeController {
  #root;
  #toggles;
  #fadeTimer = 0;

  constructor(root, toggles) {
    this.#root = root;
    this.#toggles = toggles;
    this.#apply(this.theme);
    toggles.forEach((toggle) => toggle.addEventListener("click", () => this.toggle()));
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
      if (!ThemeController.#read()) this.#apply(event.matches ? "dark" : "light");
    });
  }

  get theme() {
    return this.#root.dataset.theme === "dark" ? "dark" : "light";
  }

  toggle() {
    const next = this.theme === "dark" ? "light" : "dark";
    ThemeController.#write(next);
    if (prefersReducedMotion()) {
      this.#apply(next);
    } else if (document.startViewTransition) {
      this.#root.classList.add("theme-switching");
      document.startViewTransition(() => this.#apply(next)).finished.finally(() => {
        this.#root.classList.remove("theme-switching");
      });
    } else {
      this.#root.classList.add("theme-fading");
      this.#apply(next);
      clearTimeout(this.#fadeTimer);
      this.#fadeTimer = setTimeout(() => this.#root.classList.remove("theme-fading"), 500);
    }
  }

  #apply(theme) {
    this.#root.dataset.theme = theme;
    const next = theme === "dark" ? "light" : "dark";
    this.#toggles.forEach((toggle) => {
      toggle.setAttribute("aria-checked", String(theme === "dark"));
      toggle.dataset.tip = `Switch to ${next}`;
    });
  }

  static #read() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  static #write(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      return true;
    } catch {
      return false;
    }
  }
}
