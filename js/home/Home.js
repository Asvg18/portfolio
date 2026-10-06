import { $, splitWords } from "../core/dom.js";
import { Marquee } from "../core/Marquee.js";
import { prefersReducedMotion, waitForFonts } from "../core/motion.js";
import { skillPills } from "../data/skills.js";
import { FigmaCursor } from "./FigmaCursor.js";
import { FolderStrip } from "./FolderStrip.js";
import { NameTyper } from "./NameTyper.js";
import { PillPhysics } from "./PillPhysics.js";
import { Playground } from "./Playground.js";
import { StageMetrics } from "./StageMetrics.js";

const HERO_FONTS = ['700 100px "Alte Haas Grotesk"', '400 30px "Alte Haas Grotesk"', '400 64px "Relationship of Melodrame"', '700 27px "Agdasima"'];
const MAX_FRAME_MS = 100;

export class Home {
  #stage;
  #metrics;
  #marquee;
  #folders;
  #playground;
  #physics = null;
  #cursor;
  #name;
  #booted = false;
  #inView = true;
  #looping = false;
  #lastFrame = 0;
  #resizeTimer = 0;

  constructor(root, { matter }) {
    this.#stage = $("#stage", root);
    const lede = $("#lede", root);
    splitWords(lede, { indexElement: (node) => node.classList.contains("emo") });

    this.#metrics = new StageMetrics(this.#stage, $("#unitProbe"));
    this.#marquee = new Marquee($("#marqueeTrack", root));
    this.#folders = new FolderStrip($("#folders", root), this.#metrics, {
      onSpotlight: (id) => this.#physics?.lift(id),
    });
    this.#playground = new Playground($("#playground", root), {
      status: $("#pillStatus", root),
      words: skillPills,
      stageRect: () => this.#stage.getBoundingClientRect(),
      onPlay: () => this.#cursor.notePlay(),
    });
    if (matter) {
      this.#physics = new PillPhysics(matter, this.#playground.items, this.#metrics, this.#folders);
      this.#playground.physics = this.#physics;
    } else {
      document.documentElement.classList.add("no-physics");
    }
    this.#cursor = new FigmaCursor($("#figCursor", root), {
      stage: this.#stage,
      lede,
      metrics: this.#metrics,
      playground: this.#playground,
      isVisible: () => this.#inView,
    });
    this.#name = new NameTyper(root);

    new IntersectionObserver(([entry]) => {
      this.#inView = entry.isIntersecting;
      if (this.#inView && this.#booted) this.#startLoop();
    }).observe(this.#stage);
    window.addEventListener("resize", () => {
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = setTimeout(() => this.#relayout(), 120);
    });
  }

  async start() {
    await waitForFonts(HERO_FONTS, 1600);
    this.#metrics.measure();
    this.#marquee.build();
    this.#folders.layout();
    this.#playground.measureAll();
    this.#physics?.buildStatics();
    this.#booted = true;
    this.#startLoop();

    document.documentElement.classList.add("intro");
    if (prefersReducedMotion()) {
      this.#name.showInstantly();
      this.#physics?.settle();
      this.#cursor.showStatic();
      return;
    }
    setTimeout(() => this.#name.type(), 900);
    setTimeout(() => this.#physics?.rain(), 2900);
    setTimeout(() => this.#cursor.enter(), 3100);
  }

  #startLoop() {
    if (this.#looping) return;
    this.#looping = true;
    requestAnimationFrame((time) => {
      this.#lastFrame = time;
      this.#frame(time);
    });
  }

  #frame(now) {
    if (!this.#inView) {
      this.#looping = false;
      return;
    }
    const dt = Math.min(now - this.#lastFrame, MAX_FRAME_MS);
    this.#lastFrame = now;
    this.#playground.stepResizes(now);
    this.#physics?.tick(dt);
    this.#cursor.tick(dt);
    requestAnimationFrame((time) => this.#frame(time));
  }

  #relayout() {
    const previous = this.#metrics.snapshot();
    this.#metrics.measure();
    this.#folders.layout();
    if (this.#physics && this.#booted) this.#physics.relayout(previous, (item) => this.#playground.measure(item));
    else this.#playground.measureAll();
    this.#cursor.relayout();
  }
}
