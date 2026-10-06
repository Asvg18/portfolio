import { $, $$, createElement, padNumber, replayClass } from "../core/dom.js";
import { EASE_IOS, clamp, prefersReducedMotion } from "../core/motion.js";

const HASH_PATTERN = /^#screens\/([\w-]+)(?:\/(\d+))?$/;
const SWIPE_DISTANCE = 44;

export class ScreensViewer {
  #dialog;
  #shell;
  #stage;
  #view;
  #strip;
  #info;
  #note;
  #tabs;
  #glide;
  #previous;
  #next;
  #fields;
  #data;
  #order;
  #projects = {};
  #current = null;
  #index = 0;
  #opener = null;
  #pushed = false;
  #closing = false;
  #canZoom = matchMedia("(hover: hover) and (pointer: fine)");

  constructor(dialog, data) {
    this.#dialog = dialog;
    this.#data = data;
    this.#order = Object.keys(data);
    this.#shell = $("#svShell", dialog);
    this.#stage = $("#svStage", dialog);
    this.#view = $("#svView", dialog);
    this.#strip = $("#svStrip", dialog);
    this.#info = $("#svInfo", dialog);
    this.#note = $("#svNote", dialog);
    this.#tabs = $$(".sv-tab", dialog);
    this.#glide = $("#svGlide", dialog);
    this.#previous = $("#svPrev", dialog);
    this.#next = $("#svNext", dialog);
    this.#fields = {
      status: $("#svStatus", dialog),
      title: $("#svTitle", dialog),
      number: $("#svNum", dialog),
      name: $("#svName", dialog),
      group: $("#svGroup", dialog),
      caption: $("#svSay", dialog),
      description: $("#svDesc", dialog),
      role: $("#svRole", dialog),
      tags: $("#svTags", dialog),
      cta: $("#svCta", dialog),
      ctaLabel: $("#svCtaLabel", dialog),
      count: $("#svCount", dialog),
    };
    dialog.tabIndex = -1;
    this.#order.forEach((id) => this.#readProject(id));
    this.#bind();
    const initial = this.#parseHash(location.hash);
    if (initial) this.#open(initial.id, initial.index, null, false);
  }

  get #frames() {
    return this.#data[this.#current].frames;
  }

  #readProject(id) {
    const card = $(`.pj[data-project="${id}"]`);
    if (!card) return;
    const role = $(".pj-role", card);
    const github = $('a[href*="github.com"]', card);
    this.#projects[id] = {
      card,
      accent: card.style.getPropertyValue("--accent").trim(),
      status: $(".pj-status", card).textContent.trim(),
      name: $(".pj-name", card).textContent.trim(),
      description: $(".pj-desc", card).textContent.trim(),
      role: role ? role.textContent.replace(/^\s*Role/, "").trim() : "",
      tags: $$(".pj-tags li", card).map((item) => item.textContent.trim()),
      github: github ? github.href : "",
    };
  }

  #source(id, frame, folder = "") {
    return `assets/img/screens/${id}/${folder}${frame.file}.webp`;
  }

  #bind() {
    document.addEventListener("click", (event) => this.#onDocumentClick(event));
    this.#tabs.forEach((tab) => tab.addEventListener("click", (event) => {
      event.preventDefault();
      const id = tab.dataset.project;
      if (id !== this.#current) this.#show(id, 0, Math.sign(this.#order.indexOf(id) - this.#order.indexOf(this.#current)));
    }));
    this.#previous.addEventListener("click", () => this.#goPrevious());
    this.#next.addEventListener("click", () => this.#goNext());
    $("#svClose", this.#dialog).addEventListener("click", () => this.#close(false));
    this.#dialog.addEventListener("keydown", (event) => this.#onKey(event));
    this.#dialog.addEventListener("close", () => this.#onClosed());
    this.#dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      const zoomed = $(".sv-frame.is-zoomed", this.#view);
      if (zoomed) zoomed.classList.remove("is-zoomed");
      else this.#close(false);
    });
    this.#bindSwipe();
    this.#bindZoom();
    window.addEventListener("popstate", () => {
      const target = this.#parseHash(location.hash);
      if (target) {
        if (this.#dialog.open) this.#show(target.id, target.index, 0);
        else this.#open(target.id, target.index, null, false);
      } else if (this.#dialog.open) {
        this.#close(true);
      }
    });
    window.addEventListener("resize", () => {
      if (!this.#dialog.open) return;
      this.#placeGlide();
      this.#markStrip();
      this.#keepThumbInView(true);
    });
  }

  #onDocumentClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const trigger = event.target.closest("[data-screens]");
    if (trigger) {
      event.preventDefault();
      this.#open(trigger.dataset.screens, 0, trigger);
      return;
    }
    const cover = event.target.closest(".pj-shot img");
    if (cover) {
      const card = cover.closest(".pj");
      this.#open(card.dataset.project, 0, $("[data-screens]", card));
    }
  }

  #onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const actions = {
      ArrowRight: () => this.#goNext(),
      ArrowLeft: () => this.#goPrevious(),
      Home: () => this.#goTo(0),
      End: () => this.#goTo(this.#frames.length - 1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  #bindSwipe() {
    let start = null;
    this.#stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") start = { x: event.clientX, y: event.clientY };
    });
    this.#stage.addEventListener("pointercancel", () => {
      start = null;
    });
    this.#stage.addEventListener("pointerup", (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0) this.#goNext();
        else this.#goPrevious();
      }
    });
  }

  #bindZoom() {
    this.#view.addEventListener("click", (event) => {
      const shot = event.target.closest(".sv-shot");
      if (!shot || !this.#canZoom.matches) return;
      const frame = shot.closest(".sv-frame");
      if (!frame.classList.contains("is-zoomed")) this.#aimZoom(frame, event);
      frame.classList.toggle("is-zoomed");
    });
    this.#view.addEventListener("pointermove", (event) => {
      const frame = $(".sv-frame.is-zoomed", this.#view);
      if (frame && event.target.closest(".sv-shot")) this.#aimZoom(frame, event);
    });
  }

  #aimZoom(frame, event) {
    const rect = $(".sv-shot", frame).getBoundingClientRect();
    frame.style.setProperty("--zx", `${(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100).toFixed(2)}%`);
    frame.style.setProperty("--zy", `${(clamp((event.clientY - rect.top) / rect.height, 0, 1) * 100).toFixed(2)}%`);
  }

  #frameElement(id, index) {
    const frame = this.#data[id].frames[index];
    const total = this.#data[id].frames.length;
    const image = new Image(frame.width, frame.height);
    image.className = "is-loading";
    image.decoding = "async";
    image.alt = `${this.#projects[id].name}, screen ${index + 1} of ${total}: ${frame.name}. ${frame.caption}`;
    image.addEventListener("load", () => image.classList.remove("is-loading"), { once: true });
    image.src = this.#source(id, frame);

    const shot = createElement("div", { className: "sv-shot", style: { "background-image": `url("${this.#source(id, frame, "thumbs/")}")` } }, [image]);
    const caption = createElement("figcaption", { className: "sv-frame-name" }, [createElement("b", { text: padNumber(index + 1) }), frame.name]);
    const selection = createElement("span", { className: "fsel sv-sel", attributes: { "aria-hidden": "true" } }, [
      ...["tl", "tr", "bl", "br"].map((corner) => createElement("i", { className: corner })),
      createElement("span", { className: "fsel-dims", text: frame.size }),
    ]);
    return createElement("figure", { className: "sv-frame", style: { "--ar": (frame.width / frame.height).toFixed(4) } }, [caption, shot, selection]);
  }

  #setProject(id, animate) {
    const project = this.#projects[id];
    const data = this.#data[id];
    const fields = this.#fields;
    this.#dialog.style.setProperty("--sv-accent", project.accent);
    this.#tabs.forEach((tab) => {
      if (tab.dataset.project === id) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    });
    this.#placeGlide();
    fields.status.textContent = project.status;
    fields.title.textContent = project.name;
    fields.description.textContent = project.description;
    fields.role.textContent = project.role;
    fields.tags.replaceChildren(...project.tags.map((tag) => createElement("li", { text: tag })));
    const cta = data.cta || (project.github ? { label: "View on GitHub", href: project.github } : null);
    fields.cta.hidden = !cta;
    if (cta) {
      fields.cta.href = cta.href;
      fields.ctaLabel.textContent = cta.label;
      if (cta.href.startsWith("mailto:")) fields.cta.removeAttribute("target");
      else fields.cta.target = "_blank";
    }
    this.#stage.setAttribute("aria-label", `${project.name} screens`);
    this.#renderStrip(id);
    if (animate && !prefersReducedMotion()) replayClass(this.#info, "is-switching");
  }

  #renderStrip(id) {
    this.#strip.replaceChildren();
    let group = null;
    this.#data[id].frames.forEach((frame, index) => {
      if (frame.group && frame.group !== group) {
        group = frame.group;
        this.#strip.append(createElement("span", { className: "sv-strip-group", text: group, attributes: { "aria-hidden": "true" } }));
      }
      const thumbnail = new Image();
      thumbnail.alt = "";
      thumbnail.loading = "lazy";
      thumbnail.decoding = "async";
      thumbnail.src = this.#source(id, frame, "thumbs/");
      const button = createElement("button", {
        className: "sv-thumb",
        attributes: { type: "button", "aria-label": `Screen ${index + 1}: ${frame.name}` },
        style: { "--ar": (frame.width / frame.height).toFixed(4) },
      }, [thumbnail, createElement("b", { text: padNumber(index + 1) })]);
      button.addEventListener("click", () => this.#goTo(index));
      this.#strip.append(button);
    });
    this.#strip.scrollLeft = 0;
    this.#markStrip();
  }

  #show(id, index, direction) {
    const frames = this.#data[id].frames;
    const position = ((index % frames.length) + frames.length) % frames.length;
    if (id !== this.#current) {
      const hadProject = Boolean(this.#current);
      this.#current = id;
      this.#setProject(id, hadProject);
    }
    this.#index = position;

    const mode = prefersReducedMotion() || !direction ? "fade" : direction > 0 ? "next" : "prev";
    $$(".sv-frame", this.#view).forEach((frame) => {
      if (/\bout-/.test(frame.className)) return;
      frame.classList.remove("is-zoomed", "in-next", "in-prev", "in-fade");
      frame.classList.add(`out-${mode}`);
      const remove = () => frame.remove();
      frame.addEventListener("animationend", remove, { once: true });
      setTimeout(remove, 650);
    });
    const frameElement = this.#frameElement(id, position);
    frameElement.classList.add(`in-${mode}`);
    this.#view.append(frameElement);

    const frame = frames[position];
    const fields = this.#fields;
    fields.number.textContent = padNumber(position + 1);
    fields.name.textContent = frame.name;
    fields.group.hidden = !frame.group;
    fields.group.textContent = frame.group || "";
    fields.caption.textContent = frame.caption;
    if (!prefersReducedMotion()) replayClass(this.#note, "is-swapping");
    fields.count.replaceChildren(createElement("b", { text: padNumber(position + 1) }), ` / ${padNumber(frames.length)}`);

    $$(".sv-thumb", this.#strip).forEach((thumb, thumbIndex) => thumb.setAttribute("aria-current", String(thumbIndex === position)));
    this.#keepThumbInView();
    this.#labelArrows();
    const hash = `#screens/${id}/${position + 1}`;
    if (this.#dialog.open && location.hash !== hash) history.replaceState(history.state, "", hash);
    [position + 1, position - 1].forEach((neighbour) => {
      new Image().src = this.#source(id, frames[(neighbour + frames.length) % frames.length]);
    });
  }

  #goTo(index) {
    this.#show(this.#current, index, Math.sign(index - this.#index));
  }

  #goNext() {
    if (this.#index < this.#frames.length - 1) this.#show(this.#current, this.#index + 1, 1);
    else this.#show(this.#neighbour(1), 0, 1);
  }

  #goPrevious() {
    if (this.#index > 0) {
      this.#show(this.#current, this.#index - 1, -1);
    } else {
      const previous = this.#neighbour(-1);
      this.#show(previous, this.#data[previous].frames.length - 1, -1);
    }
  }

  #neighbour(step) {
    const count = this.#order.length;
    return this.#order[(this.#order.indexOf(this.#current) + step + count) % count];
  }

  #labelArrows() {
    const atEnd = this.#index === this.#frames.length - 1;
    const atStart = this.#index === 0;
    const nextName = this.#projects[this.#neighbour(1)].name;
    const previousName = this.#projects[this.#neighbour(-1)].name;
    this.#next.setAttribute("aria-label", atEnd ? `Next project: ${nextName}` : "Next screen");
    this.#next.dataset.tip = atEnd ? `Next: ${nextName}` : "Next";
    this.#previous.setAttribute("aria-label", atStart ? `Previous project: ${previousName}` : "Previous screen");
    this.#previous.dataset.tip = atStart ? `Back to ${previousName}` : "Previous";
  }

  #placeGlide() {
    const tab = this.#tabs.find((candidate) => candidate.dataset.project === this.#current);
    if (!tab) return;
    this.#glide.style.setProperty("--gx", `${tab.offsetLeft}px`);
    this.#glide.style.setProperty("--gw", `${tab.offsetWidth}px`);
    this.#glide.style.setProperty("--gdot", tab.style.getPropertyValue("--dot"));
  }

  #markStrip() {
    this.#strip.classList.toggle("is-overflowing", this.#strip.scrollWidth > this.#strip.clientWidth + 2);
  }

  #keepThumbInView(instant = false) {
    const thumb = $('.sv-thumb[aria-current="true"]', this.#strip);
    if (!thumb) return;
    this.#strip.scrollTo({
      left: thumb.offsetLeft - (this.#strip.clientWidth - thumb.offsetWidth) / 2,
      behavior: instant || prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  #cardRect(id) {
    const rect = this.#projects[id].card.getBoundingClientRect();
    return rect.width && rect.bottom > 0 && rect.top < window.innerHeight ? rect : null;
  }

  #cardInset(id, rect) {
    const radius = getComputedStyle(this.#projects[id].card).borderTopLeftRadius || "28px";
    const top = Math.max(0, rect.top);
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    const left = Math.max(0, rect.left);
    return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius})`;
  }

  #open(id, index, trigger, push = true) {
    if (!this.#data[id] || !this.#projects[id]) return;
    if (this.#dialog.open) {
      this.#show(id, index, 0);
      return;
    }
    this.#opener = trigger || document.activeElement;
    this.#current = null;
    this.#view.replaceChildren();
    this.#show(id, index, 0);
    if (push) {
      history.pushState({ screens: true }, "", `#screens/${id}/${this.#index + 1}`);
      this.#pushed = true;
    }
    document.documentElement.classList.add("sv-open");
    this.#dialog.showModal();
    this.#dialog.focus({ preventScroll: true });
    this.#glide.style.transition = "none";
    this.#placeGlide();
    void this.#glide.offsetWidth;
    this.#glide.style.transition = "";
    this.#markStrip();
    this.#keepThumbInView(true);
    if (prefersReducedMotion()) return;
    const rect = this.#cardRect(id);
    if (rect) {
      this.#dialog.animate([{ clipPath: this.#cardInset(id, rect) }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: 640, easing: EASE_IOS });
      this.#shell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 140, easing: "ease", fill: "backwards" });
    } else {
      this.#dialog.animate([{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: "cubic-bezier(0.16, 0.84, 0.24, 1)" });
    }
  }

  #close(fromHistory) {
    if (!this.#dialog.open || this.#closing) return;
    this.#closing = true;
    const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => this.#fold()));
    if (fromHistory) {
      this.#pushed = false;
      settle();
      return;
    }
    if (!this.#pushed) {
      history.replaceState(null, "", location.pathname + location.search);
      this.#fold();
      return;
    }
    this.#pushed = false;
    let landed = false;
    const afterBack = () => {
      if (landed) return;
      landed = true;
      window.removeEventListener("popstate", afterBack);
      settle();
    };
    window.addEventListener("popstate", afterBack);
    setTimeout(afterBack, 400);
    history.back();
  }

  #fold() {
    let rect = this.#cardRect(this.#current);
    if (!rect) {
      this.#projects[this.#current].card.scrollIntoView({ block: "center", behavior: "instant" });
      rect = this.#cardRect(this.#current);
    }
    if (prefersReducedMotion()) {
      this.#dialog.close();
      return;
    }
    const animations = rect
      ? [
          this.#shell.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease", fill: "forwards" }),
          this.#dialog.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: this.#cardInset(this.#current, rect) }], { duration: 540, easing: EASE_IOS, fill: "forwards" }),
        ]
      : [this.#dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease", fill: "forwards" })];
    const done = () => {
      this.#dialog.close();
      animations.forEach((animation) => animation.cancel());
    };
    animations.at(-1).finished.then(done, done);
  }

  #onClosed() {
    if (!this.#closing) {
      if (this.#pushed) {
        this.#pushed = false;
        history.back();
      } else if (location.hash.startsWith("#screens/")) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    }
    this.#closing = false;
    document.documentElement.classList.remove("sv-open");
    this.#view.replaceChildren();
    const returnTo = this.#opener?.closest?.(".pj") ? $(`[data-screens="${this.#current}"]`) : this.#opener;
    if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    this.#opener = null;
  }

  #parseHash(hash) {
    const match = HASH_PATTERN.exec(hash);
    if (!match || !this.#data[match[1]]) return null;
    return { id: match[1], index: Math.max(0, (parseInt(match[2], 10) || 1) - 1) };
  }
}
