const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW = 296;
const STROKE_WIDTH = 4.5;
const MIN_STEP = 0.75;

const round = (value) => Math.round(value * 10) / 10;

function pathData(points) {
  const [first] = points;
  let data = `M${round(first.x)} ${round(first.y)}`;
  if (points.length === 1) return `${data}h0.01`;
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index];
    const next = points[index + 1];
    data += `Q${round(point.x)} ${round(point.y)} ${round((point.x + next.x) / 2)} ${round((point.y + next.y) / 2)}`;
  }
  const last = points.at(-1);
  return `${data}L${round(last.x)} ${round(last.y)}`;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length)) : 0;
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function touches(stroke, point, reach) {
  const { points } = stroke;
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= reach;
  for (let index = 1; index < points.length; index++) {
    if (distanceToSegment(point, points[index - 1], points[index]) <= reach) return true;
  }
  return false;
}

export class Sketchpad {
  static #order = 0;
  #note;
  #paper;
  #svg;
  #strokes = [];

  constructor(note) {
    this.#note = note;
    this.#paper = note.firstElementChild;
    this.#svg = document.createElementNS(SVG_NS, "svg");
    this.#svg.setAttribute("class", "ink");
    this.#svg.setAttribute("viewBox", `0 0 ${VIEW} ${VIEW}`);
    this.#svg.setAttribute("aria-hidden", "true");
    this.#paper.append(this.#svg);
  }

  get surface() {
    return this.#svg;
  }

  get isEmpty() {
    return this.#strokes.length === 0;
  }

  locate(clientX, clientY) {
    const rect = this.#paper.getBoundingClientRect();
    const size = this.#paper.offsetWidth;
    const angle = ((parseFloat(getComputedStyle(this.#note).rotate) || 0) * Math.PI) / 180;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const scale = VIEW / size;
    return {
      x: (dx * Math.cos(angle) + dy * Math.sin(angle) + size / 2) * scale,
      y: (-dx * Math.sin(angle) + dy * Math.cos(angle) + size / 2) * scale,
    };
  }

  toUnits(pixels) {
    return (pixels * VIEW) / this.#paper.offsetWidth;
  }

  begin(point, color) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", STROKE_WIDTH);
    const stroke = { order: Sketchpad.#order++, color, points: [point], path };
    path.setAttribute("d", pathData(stroke.points));
    this.#svg.append(path);
    this.#strokes.push(stroke);
    return stroke;
  }

  extend(stroke, points) {
    points.forEach((point) => {
      const last = stroke.points.at(-1);
      if (Math.hypot(point.x - last.x, point.y - last.y) >= MIN_STEP) stroke.points.push(point);
    });
    stroke.path.setAttribute("d", pathData(stroke.points));
  }

  erase(from, to, radius) {
    const reach = radius + STROKE_WIDTH / 2;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (radius / 2)));
    const hit = this.#strokes.filter((stroke) => {
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        if (touches(stroke, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, reach)) return true;
      }
      return false;
    });
    this.remove(hit);
    return hit;
  }

  add(strokes) {
    strokes.forEach((stroke) => {
      const index = this.#strokes.findIndex((other) => other.order > stroke.order);
      const next = this.#strokes[index];
      this.#svg.insertBefore(stroke.path, next ? next.path : null);
      this.#strokes.splice(index === -1 ? this.#strokes.length : index, 0, stroke);
    });
  }

  remove(strokes) {
    strokes.forEach((stroke) => stroke.path.remove());
    this.#strokes = this.#strokes.filter((stroke) => !strokes.includes(stroke));
  }

  clear() {
    const strokes = [...this.#strokes];
    this.remove(strokes);
    return strokes;
  }
}
