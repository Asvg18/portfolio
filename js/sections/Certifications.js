import { $, $$, createElement, replayClass } from "../core/dom.js";
import { prefersReducedMotion } from "../core/motion.js";
import { CertificateViewer } from "../components/CertificateViewer.js";
import { Flashcard } from "../components/Flashcard.js";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const LONG_TITLE = 40;
const CARD_LANDING_SECONDS = 1.7;
const CUE_PAUSE_SECONDS = 3;

export class Certifications {
  #section;
  #list;
  #panel;
  #count;
  #chips;
  #fields;
  #entries;
  #years = [];
  #current = 0;
  #flashcard;
  #viewer = null;
  #oneColumn = matchMedia("(max-width: 1099px)");

  constructor(section, canvas, certifications) {
    this.#section = section;
    this.#list = $("#vhList", section);
    this.#panel = $("#vhPanel", section);
    this.#count = $("#vhCount", section);
    this.#chips = $$(".vh-chip", section);
    this.#fields = {
      card: $("#pass", section),
      type: $("#passType", section),
      role: $("#passRole", section),
      title: $("#passTitle", section),
      issuer: $("#passIssuer", section),
      date: $("#passDate", section),
      note: $("#passNote", section),
      skills: $("#passSkills", section),
      image: $("#passImg", section),
      empty: $("#passEmpty", section),
      link: $("#passLink", section),
    };
    this.#entries = certifications
      .map((certificate) => ({
        ...certificate,
        displayDate: DATE_FORMAT.format(new Date(certificate.date)),
        year: certificate.date.slice(0, 4),
        imageSrc: certificate.image ? `assets/img/certs/${certificate.id}.webp` : "",
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    this.#render();
    this.#flashcard = new Flashcard(this.#fields.card, {
      flipButton: $("#passFlip", section),
      hint: $("#flipHint", section),
      isActive: () => section.classList.contains("is-on"),
    });
    const dialog = $("#certView");
    if (typeof dialog?.showModal === "function") {
      this.#viewer = new CertificateViewer(dialog, { origin: this.#fields.card, returnFocus: this.#fields.link });
    }
    this.#bind(canvas);
    this.#current = Math.max(0, this.#entries.findIndex(({ featured }) => featured));
    this.#updateTabs();
    this.#show(this.#entries[this.#current], { animate: false });
    this.#filter("all");
  }

  #render() {
    const counts = { all: this.#entries.length };
    let year = null;
    this.#entries.forEach((entry, index) => {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
      if (entry.year !== year) {
        year = entry.year;
        const label = createElement("p", { className: "vh-year", text: year, attributes: { "aria-hidden": "true" } });
        this.#years.push(label);
        this.#list.append(label);
      }
      entry.tab = createElement("button", {
        attributes: { role: "tab", type: "button", id: `vh-${index}`, "aria-selected": "false", "aria-controls": this.#panel.id, tabindex: "-1" },
      }, [
        createElement("span", { className: "vh-date", text: entry.displayDate }),
        createElement("b", { text: entry.title }),
        createElement("span", { className: "vh-by", text: entry.issuer }),
      ]);
      entry.tab.toggleAttribute("data-star", Boolean(entry.featured));
      this.#list.append(entry.tab);
    });
    this.#chips.forEach((chip) => {
      $("i", chip).textContent = counts[chip.dataset.filter] || 0;
    });
  }

  #bind(canvas) {
    this.#entries.forEach((entry, index) => {
      entry.tab.addEventListener("click", () => {
        this.#select(index);
        this.#bringPanelIntoView();
      });
      entry.tab.addEventListener("keydown", (event) => this.#onTabKey(event, entry));
    });
    this.#chips.forEach((chip) => chip.addEventListener("click", () => this.#filter(chip.dataset.filter)));
    this.#list.addEventListener("scroll", () => this.#markListEnd(), { passive: true });
    window.addEventListener("resize", () => this.#markListEnd());
    this.#fields.image.addEventListener("load", () => this.#fields.image.classList.remove("is-loading"));
    this.#fields.link.addEventListener("click", (event) => this.#onLinkClick(event));
    canvas.addEventListener("reveal", ({ detail }) => {
      if (detail.block === this.#panel) this.#flashcard.cueIn((detail.delay + CARD_LANDING_SECONDS + CUE_PAUSE_SECONDS) * 1000);
    });
    canvas.addEventListener("reset", ({ detail }) => {
      if (detail.section === this.#section) this.#flashcard.reset();
    });
  }

  get #visibleEntries() {
    return this.#entries.filter(({ tab }) => !tab.hidden);
  }

  #onTabKey(event, entry) {
    const visible = this.#visibleEntries;
    const position = visible.indexOf(entry);
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    let next = null;
    if (step) next = visible[(position + step + visible.length) % visible.length];
    else if (event.key === "Home") next = visible[0];
    else if (event.key === "End") next = visible[visible.length - 1];
    if (!next) return;
    event.preventDefault();
    this.#select(this.#entries.indexOf(next), true);
  }

  #select(index, focus = false) {
    const entry = this.#entries[index];
    if (index !== this.#current) {
      this.#current = index;
      this.#updateTabs();
      this.#show(entry);
    }
    if (focus) entry.tab.focus({ preventScroll: true });
    this.#keepInList(entry.tab);
  }

  #updateTabs() {
    this.#entries.forEach(({ tab }, index) => {
      const selected = index === this.#current;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    this.#panel.setAttribute("aria-labelledby", this.#entries[this.#current].tab.id);
  }

  #show(entry, { animate = true } = {}) {
    const fields = this.#fields;
    fields.card.style.setProperty("--pc", entry.hue);
    fields.type.textContent = entry.type;
    fields.role.textContent = entry.role || "";
    fields.role.hidden = !entry.role;
    fields.title.textContent = entry.title;
    fields.title.classList.toggle("is-long", entry.title.length > LONG_TITLE);
    fields.issuer.textContent = entry.issuer;
    fields.date.textContent = entry.displayDate;
    fields.note.textContent = entry.note;
    fields.skills.replaceChildren(...entry.skills.map((skill) => createElement("li", { text: skill })));
    this.#showCertificateImage(entry);
    this.#showProofLink(entry);
    if (animate && !prefersReducedMotion()) replayClass(fields.card, "is-swapping");
  }

  #showCertificateImage(entry) {
    const { image, empty } = this.#fields;
    if (entry.imageSrc) {
      if (image.getAttribute("src") !== entry.imageSrc) {
        image.classList.add("is-loading");
        image.src = entry.imageSrc;
      }
      image.alt = `Certificate: ${entry.title}, issued by ${entry.issuer}`;
    }
    image.hidden = !entry.imageSrc;
    empty.hidden = Boolean(entry.imageSrc);
  }

  #showProofLink(entry) {
    const link = this.#fields.link;
    const opensViewer = !entry.verifyUrl;
    link.hidden = !entry.verifyUrl && !entry.imageSrc;
    link.href = entry.verifyUrl || entry.imageSrc || "#";
    link.toggleAttribute("data-view", opensViewer);
    link.setAttribute("aria-haspopup", opensViewer ? "dialog" : "false");
    $("span", link).textContent = opensViewer ? "View full size" : "Verify on Coursera";
    $("use", link).setAttribute("href", opensViewer ? "#i-expand" : "#i-external");
  }

  #onLinkClick(event) {
    const link = this.#fields.link;
    if (!this.#viewer || !link.hasAttribute("data-view")) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.#viewer.open(this.#entries[this.#current], this.#fields.image);
  }

  #filter(category) {
    this.#chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.filter === category)));
    this.#entries.forEach(({ tab, category: entryCategory }) => {
      tab.hidden = category !== "all" && entryCategory !== category;
      tab.classList.remove("is-end");
    });
    this.#years.forEach((label) => {
      const group = [];
      for (let node = label.nextElementSibling; node && !node.classList.contains("vh-year"); node = node.nextElementSibling) {
        if (!node.hidden) group.push(node);
      }
      label.hidden = !group.length;
      group.at(-1)?.classList.add("is-end");
    });
    const visible = this.#visibleEntries;
    this.#count.textContent = `${visible.length} ${visible.length === 1 ? "version" : "versions"}`;
    this.#list.scrollTop = 0;
    if (this.#entries[this.#current].tab.hidden) this.#select(this.#entries.indexOf(visible[0]));
    else this.#keepInList(this.#entries[this.#current].tab);
    this.#markListEnd();
  }

  #keepInList(tab) {
    const list = this.#list;
    const top = tab.offsetTop - 34;
    const bottom = tab.offsetTop + tab.offsetHeight + 8;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }

  #markListEnd() {
    const list = this.#list;
    list.classList.toggle("is-end", list.scrollHeight - list.clientHeight - list.scrollTop < 4);
  }

  #bringPanelIntoView() {
    if (!this.#oneColumn.matches) return;
    const rect = this.#panel.getBoundingClientRect();
    if (rect.top < 84 || rect.bottom > window.innerHeight) {
      this.#panel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
  }
}
