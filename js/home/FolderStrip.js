import { $ } from "../core/dom.js";
import { clamp } from "../core/motion.js";

const FOLDER_IDS = ["about", "projects", "certs", "resume"];

const fixed = (value) => value.toFixed(1);

function cubicPoints(p0, p1, p2, p3, steps) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    points.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return points;
}

export class FolderStrip {
  #nav;
  #metrics;
  #onSpotlight;
  #folders = {};
  #spotlit = null;
  #spotlightTimer = 0;

  geometry = null;

  constructor(nav, metrics, { onSpotlight }) {
    this.#nav = nav;
    this.#metrics = metrics;
    this.#onSpotlight = onSpotlight;
    FOLDER_IDS.forEach((id) => {
      const element = $(`.folder[data-id="${id}"]`, nav);
      this.#folders[id] = {
        element,
        face: $(".face", element),
        label: $(".folder-label", element),
        rim: $(".folder-rim path", element),
      };
      this.#bind(id);
    });
  }

  get groundIds() {
    return ["about", "projects"];
  }

  layout() {
    const unit = this.#metrics.unit;
    this.geometry = this.#computeGeometry();
    FOLDER_IDS.forEach((id) => {
      const shape = this.geometry.folders[id];
      const { element, face, label, rim } = this.#folders[id];
      const style = element.style;
      style.top = `${shape.top}px`;
      style.height = `${shape.box}px`;
      face.style.clipPath = `path("${shape.path}")`;
      rim.setAttribute("d", shape.path);
      style.setProperty("--gh", `${shape.gradientHeight}px`);
      style.setProperty("--vh", `${shape.top ? this.geometry.height - shape.top : 120 * unit}px`);
      style.setProperty("--lx", `${shape.labelX}px`);
      style.setProperty("--ly", `${29 * unit}px`);
      style.setProperty("--px", `${shape.papersX}px`);
      const chip = Math.max(34, 44 * unit);
      style.setProperty("--gx", `${shape.labelX + label.offsetWidth * 1.09 + 18 * unit}px`);
      style.setProperty("--gy", `${29 * unit + 34 * unit - chip / 2}px`);
    });
  }

  #computeGeometry() {
    const width = this.#nav.clientWidth;
    const height = this.#nav.clientHeight;
    const u = this.#metrics.unit;
    const rowHeight = 120 * u;
    const overhang = 60 * u + 40;
    const aboutEnd = width * 0.55;
    const aboutStart = aboutEnd - 232 * u;
    const projectsStart = aboutEnd - 170 * u;
    const projectsEnd = projectsStart + 259 * u;
    const projectsDrop = 200 * u;
    const certsEnd = width * 0.717;
    const certsStart = certsEnd - 333 * u;
    const certsDrop = 118 * u;
    const resumeStart = certsEnd - 216 * u;
    const resumeEnd = resumeStart + 214 * u;
    const corner = 40 * u;
    const topBox = height + overhang;
    const bottomBox = height - rowHeight + overhang;
    const papersX = (x) => clamp(x, 210 * u, width - 210 * u);

    return {
      width,
      height,
      folders: {
        about: {
          top: 0,
          box: topBox,
          gradientHeight: 120 * u,
          path: `M0 ${fixed(topBox)}L0 ${fixed(14 * u)}C0 ${fixed(4 * u)} ${fixed(12 * u)} 0 ${fixed(corner)} 0L${fixed(aboutStart)} 0C${fixed(aboutStart + 164.8 * u)} 0 ${fixed(aboutEnd - 113.8 * u)} ${fixed(120 * u)} ${fixed(aboutEnd)} ${fixed(120 * u)}L${fixed(aboutEnd)} ${fixed(topBox)}Z`,
          edge: [[0, 14 * u]].concat(
            cubicPoints([0, 14 * u], [0, 4 * u], [12 * u, 0], [corner, 0], 4).slice(1),
            [[aboutStart, 0]],
            cubicPoints([aboutStart, 0], [aboutStart + 164.8 * u, 0], [aboutEnd - 113.8 * u, 120 * u], [aboutEnd, 120 * u], 18).slice(1),
            [[aboutEnd, 170 * u]],
          ),
          labelX: 46 * u,
          papersX: papersX(aboutStart - 200 * u),
        },
        projects: {
          top: 0,
          box: topBox,
          gradientHeight: projectsDrop,
          path: `M${fixed(projectsStart)} ${fixed(topBox)}L${fixed(projectsStart)} ${fixed(projectsDrop)}C${fixed(projectsStart + 126.7 * u)} ${fixed(projectsDrop)} ${fixed(projectsEnd - 198.2 * u)} 0 ${fixed(projectsEnd)} 0L${fixed(width)} 0L${fixed(width)} ${fixed(topBox)}Z`,
          edge: cubicPoints([projectsStart, projectsDrop], [projectsStart + 126.7 * u, projectsDrop], [projectsEnd - 198.2 * u, 0], [projectsEnd, 0], 20).concat([[width, 0]]),
          labelX: projectsStart + 190 * u,
          papersX: papersX(projectsEnd + 300 * u),
        },
        certs: {
          top: rowHeight,
          box: bottomBox,
          gradientHeight: 119 * u,
          path: `M0 ${fixed(bottomBox)}L0 0L${fixed(certsStart)} 0C${fixed(certsStart + 256.5 * u)} 0 ${fixed(certsEnd - 162.8 * u)} ${fixed(certsDrop)} ${fixed(certsEnd)} ${fixed(certsDrop)}L${fixed(certsEnd)} ${fixed(bottomBox)}Z`,
          edge: null,
          labelX: 46 * u,
          papersX: papersX(certsStart - 230 * u),
        },
        resume: {
          top: rowHeight,
          box: bottomBox,
          gradientHeight: 119 * u,
          path: `M${fixed(resumeStart)} ${fixed(bottomBox)}L${fixed(resumeStart)} ${fixed(certsDrop)}C${fixed(resumeStart + 104.4 * u)} ${fixed(certsDrop)} ${fixed(resumeEnd - 166.3 * u)} 0 ${fixed(resumeEnd)} 0L${fixed(width)} 0L${fixed(width)} ${fixed(bottomBox)}Z`,
          edge: null,
          labelX: resumeStart + 160 * u,
          papersX: papersX(resumeEnd + 210 * u),
        },
      },
    };
  }

  #bind(id) {
    const { face } = this.#folders[id];
    face.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") this.#spotlight(id);
    });
    face.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && this.#spotlit === id) this.#clearSpotlight();
    });
    face.addEventListener("focus", () => {
      if (face.matches(":focus-visible")) this.#spotlight(id);
    });
    face.addEventListener("blur", () => {
      if (this.#spotlit === id) this.#clearSpotlight();
    });
  }

  #spotlight(id) {
    clearTimeout(this.#spotlightTimer);
    this.#spotlit = id;
    this.#nav.classList.toggle("is-spot", Boolean(id));
    FOLDER_IDS.forEach((key) => this.#folders[key].element.classList.toggle("is-active", key === id));
    this.#onSpotlight(id);
  }

  #clearSpotlight() {
    clearTimeout(this.#spotlightTimer);
    this.#spotlightTimer = setTimeout(() => this.#spotlight(null), 90);
  }
}
