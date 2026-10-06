export class StageMetrics {
  #stage;
  #probe;

  unit = 1;
  width = 0;
  height = 0;

  constructor(stage, probe) {
    this.#stage = stage;
    this.#probe = probe;
  }

  measure() {
    this.unit = (this.#probe.getBoundingClientRect().width || 1000) / 1000;
    this.width = this.#stage.clientWidth;
    this.height = this.#stage.clientHeight;
  }

  snapshot() {
    return { unit: this.unit, width: this.width, height: this.height };
  }
}
