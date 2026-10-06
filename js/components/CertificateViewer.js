import { $ } from "../core/dom.js";
import { EASE_IOS, prefersReducedMotion } from "../core/motion.js";

export class CertificateViewer {
  #dialog;
  #wrap;
  #frame;
  #image;
  #scrim;
  #fields;
  #origin;
  #returnFocus;
  #pushed = false;
  #closing = false;

  constructor(dialog, { origin, returnFocus }) {
    this.#dialog = dialog;
    this.#wrap = $(".cz-wrap", dialog);
    this.#frame = $(".cz-frame", dialog);
    this.#image = $(".cz-img", dialog);
    this.#scrim = $(".cz-scrim", dialog);
    this.#fields = {
      kind: $("#czKind", dialog),
      title: $("#czTitle", dialog),
      by: $("#czBy", dialog),
      file: $("#czFile", dialog),
      dimensions: $("#czDims", dialog),
    };
    this.#origin = origin;
    this.#returnFocus = returnFocus;
    this.#bind();
  }

  open(certificate, preview) {
    if (this.#dialog.open) return;
    const { kind, title, by, file } = this.#fields;
    kind.textContent = [certificate.type, certificate.role].filter(Boolean).join(" · ");
    title.textContent = certificate.title;
    by.textContent = `${certificate.issuer} · ${certificate.displayDate}`;
    file.textContent = `${certificate.id}.png`;
    if (preview?.naturalWidth && preview.getAttribute("src") === certificate.imageSrc) {
      this.#setRatio(preview.naturalWidth, preview.naturalHeight);
    }
    this.#image.src = certificate.imageSrc;
    this.#image.alt = preview?.alt ?? "";
    document.documentElement.classList.add("cz-open");
    this.#dialog.showModal();
    history.pushState({ certificateViewer: true }, "");
    this.#pushed = true;
    if (prefersReducedMotion()) return;
    const from = this.#originTransform();
    this.#wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease" });
    this.#scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease" });
    if (from) this.#frame.animate([{ transform: from }, { transform: "none" }], { duration: 620, easing: EASE_IOS });
  }

  close() {
    if (this.#closing) return;
    if (this.#pushed) {
      this.#pushed = false;
      history.back();
    } else {
      this.#fold();
    }
  }

  #bind() {
    this.#image.addEventListener("load", () => this.#setRatio(this.#image.naturalWidth, this.#image.naturalHeight));
    window.addEventListener("popstate", () => {
      if (!this.#dialog.open) return;
      this.#pushed = false;
      this.#fold();
    });
    this.#dialog.addEventListener("close", () => {
      this.#closing = false;
      document.documentElement.classList.remove("cz-open");
      this.#dialog.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      if (this.#pushed) {
        this.#pushed = false;
        history.back();
      }
      this.#returnFocus.focus({ preventScroll: true });
    });
    this.#dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    $("#czClose", this.#dialog).addEventListener("click", () => this.close());
    this.#dialog.addEventListener("click", (event) => {
      if (!event.target.closest(".cz-frame, .cz-top")) this.close();
    });
  }

  #fold() {
    if (!this.#dialog.open || this.#closing) return;
    this.#closing = true;
    const done = () => this.#dialog.close();
    if (prefersReducedMotion()) {
      done();
      return;
    }
    const to = this.#originTransform();
    const animations = [
      this.#wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 120, easing: "ease", fill: "forwards" }),
      this.#scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease", fill: "forwards" }),
    ];
    if (to) animations.push(this.#frame.animate([{ transform: "none" }, { transform: to }], { duration: 460, easing: EASE_IOS, fill: "forwards" }));
    Promise.all(animations.map((animation) => animation.finished)).then(done, done);
  }

  #originTransform() {
    const from = this.#origin.getBoundingClientRect();
    const to = this.#frame.getBoundingClientRect();
    if (!from.width || !to.width || from.bottom < 0 || from.top > window.innerHeight) return null;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
  }

  #setRatio(width, height) {
    this.#wrap.style.setProperty("--ar", (width / height).toFixed(4));
    this.#fields.dimensions.textContent = `${width} × ${height}`;
  }
}
