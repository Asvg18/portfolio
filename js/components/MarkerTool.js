import { $, $$ } from "../core/dom.js";
import { Sketchpad } from "./Sketchpad.js";

const ERASER_RADIUS = 12;
const HISTORY_LIMIT = 200;

export class MarkerTool {
  #root;
  #toast;
  #pads;
  #tools;
  #inks;
  #undo;
  #reset;
  #tool = null;
  #ink;
  #history = [];
  #gesture = null;
  #inView = false;

  constructor(root, toast) {
    this.#root = root;
    this.#toast = toast;
    this.#pads = $$(".note", root).map((note) => new Sketchpad(note));
    this.#tools = $$("[data-tool]", root);
    this.#inks = $$("[data-ink]", root);
    this.#undo = $('[data-action="undo"]', root);
    this.#reset = $('[data-action="reset"]', root);
    this.#ink = this.#inks.find((button) => button.getAttribute("aria-pressed") === "true").dataset.ink;
    this.#bind();
  }

  #bind() {
    this.#tools.forEach((button) => button.addEventListener("click", () => {
      this.#use(this.#tool === button.dataset.tool ? null : button.dataset.tool);
    }));
    this.#inks.forEach((button) => button.addEventListener("click", () => {
      this.#ink = button.dataset.ink;
      this.#use("marker");
    }));
    this.#undo.addEventListener("click", () => this.#undoLast());
    this.#reset.addEventListener("click", () => this.#clearAll());

    const notes = $(".notes", this.#root);
    notes.addEventListener("pointerdown", (event) => this.#start(event));
    notes.addEventListener("pointermove", (event) => this.#continue(event));
    notes.addEventListener("pointerup", (event) => this.#finish(event));
    notes.addEventListener("pointercancel", (event) => this.#finish(event));
    document.addEventListener("keydown", (event) => this.#onKey(event));

    new IntersectionObserver(([entry]) => {
      this.#inView = entry.isIntersecting;
      if (!this.#inView) this.#use(null);
    }).observe(this.#root);
  }

  #use(tool) {
    this.#tool = tool;
    if (tool) this.#root.dataset.drawing = tool;
    else delete this.#root.dataset.drawing;
    this.#tools.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tool === tool)));
    this.#inks.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.ink === this.#ink)));
    this.#pads.forEach(({ surface }) => {
      if (tool) surface.dataset.cursor = tool;
      else delete surface.dataset.cursor;
      surface.dataset.cursorColor = this.#ink;
    });
  }

  #start(event) {
    const pad = this.#pads.find(({ surface }) => surface === event.target.closest(".ink"));
    if (!this.#tool || !pad || this.#gesture || event.button !== 0) return;
    event.preventDefault();
    pad.surface.setPointerCapture(event.pointerId);
    const point = pad.locate(event.clientX, event.clientY);
    this.#gesture = { pad, pointerId: event.pointerId, last: point };
    if (this.#tool === "marker") {
      this.#gesture.stroke = pad.begin(point, this.#ink);
    } else {
      this.#gesture.erased = pad.erase(point, point, pad.toUnits(ERASER_RADIUS));
    }
    this.#refresh();
  }

  #continue(event) {
    const gesture = this.#gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const events = event.getCoalescedEvents?.() ?? [];
    const points = (events.length ? events : [event]).map(({ clientX, clientY }) => gesture.pad.locate(clientX, clientY));
    if (gesture.stroke) {
      gesture.pad.extend(gesture.stroke, points);
    } else {
      const radius = gesture.pad.toUnits(ERASER_RADIUS);
      points.forEach((point) => {
        gesture.erased.push(...gesture.pad.erase(gesture.last, point, radius));
        gesture.last = point;
      });
      this.#refresh();
    }
  }

  #finish(event) {
    const gesture = this.#gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    this.#gesture = null;
    const { pad, stroke, erased } = gesture;
    if (stroke) this.#record(() => pad.remove([stroke]));
    else if (erased.length) this.#record(() => pad.add(erased));
    this.#refresh();
  }

  #record(revert) {
    this.#history.push(revert);
    if (this.#history.length > HISTORY_LIMIT) this.#history.shift();
  }

  #undoLast() {
    const revert = this.#history.pop();
    if (!revert) return;
    revert();
    this.#refresh();
  }

  #clearAll() {
    const cleared = this.#pads.map((pad) => [pad, pad.clear()]).filter(([, strokes]) => strokes.length);
    if (!cleared.length) return;
    this.#record(() => cleared.forEach(([pad, strokes]) => pad.add(strokes)));
    this.#refresh();
    this.#toast.show("Notes reset. Undo brings your drawing back.");
  }

  #onKey(event) {
    if (event.key === "Escape" && this.#tool) {
      this.#use(null);
      return;
    }
    const isUndo = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "z";
    if (isUndo && this.#inView && this.#history.length && !this.#gesture) {
      event.preventDefault();
      this.#undoLast();
    }
  }

  #refresh() {
    this.#undo.setAttribute("aria-disabled", String(this.#history.length === 0));
    this.#reset.setAttribute("aria-disabled", String(this.#pads.every((pad) => pad.isEmpty)));
  }
}
