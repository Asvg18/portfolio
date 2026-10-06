import { clamp, random } from "../core/motion.js";

const STEP = 1000 / 60;
const MAX_SPEED = 42;
const MAX_SPIN = 0.4;
const SETTLE_STEPS = 900;

export class PillPhysics {
  #matter;
  #engine;
  #items;
  #metrics;
  #folders;
  #statics = [];
  #ground = {};
  #liftOffset = {};
  #liftTarget = {};
  #grabs = new Map();
  #accumulator = 0;

  constructor(matter, items, metrics, folders) {
    this.#matter = matter;
    this.#items = items;
    this.#metrics = metrics;
    this.#folders = folders;
    this.#engine = matter.Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
    this.#engine.gravity.y = 1;
    this.#engine.gravity.scale = 0.0011;
    matter.Events.on(this.#engine, "beforeUpdate", () => this.#limitSpeeds());
  }

  get #world() {
    return this.#engine.world;
  }

  buildStatics() {
    const { Bodies, Composite } = this.#matter;
    const { width, height } = this.#metrics;
    const geometry = this.#folders.geometry;
    if (this.#statics.length) Composite.remove(this.#world, this.#statics);
    this.#statics = [];
    this.#ground = {};
    const top = height - geometry.height;
    this.#folders.groundIds.forEach((id) => {
      const points = geometry.folders[id].edge.map(([x, y]) => [x, y + top]);
      this.#ground[id] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const segment = this.#segment(points[i], points[i + 1], 80);
        if (!segment) continue;
        segment.plugin.base = { x: segment.position.x, y: segment.position.y };
        this.#ground[id].push(segment);
        this.#statics.push(segment);
      }
      this.#liftOffset[id] ??= 0;
    });
    const wallHeight = height * 4 + 2000;
    this.#statics.push(
      Bodies.rectangle(-100, height - wallHeight / 2 + 200, 200, wallHeight, { isStatic: true }),
      Bodies.rectangle(width + 100, height - wallHeight / 2 + 200, 200, wallHeight, { isStatic: true }),
      Bodies.rectangle(width / 2, height + 100, width + 400, 200, { isStatic: true }),
      Bodies.rectangle(width / 2, -height * 2 - 300, width + 400, 200, { isStatic: true }),
    );
    Composite.add(this.#world, this.#statics);
  }

  rain(onDone) {
    const { Body } = this.#matter;
    const { width, unit } = this.#metrics;
    const order = this.#items.slice().sort(() => Math.random() - 0.5);
    const margin = Math.min(120 * unit + 40, width * 0.12);
    const slots = order.map((_, i) => margin + ((i + 0.5) / order.length) * (width - margin * 2)).sort(() => Math.random() - 0.5);
    order.forEach((item, i) => {
      setTimeout(() => {
        const x = clamp(slots[i] + random(-30, 30) * unit, item.width / 2 + 4, width - item.width / 2 - 4);
        const body = this.#addBody(item, x, -item.height - random(10, 140) * unit, random(-0.5, 0.5));
        Body.setVelocity(body, { x: random(-1.2, 1.2), y: random(1, 3) });
        Body.setAngularVelocity(body, random(-0.05, 0.05));
        item.element.style.visibility = "visible";
        this.render(item);
        if (i === order.length - 1 && onDone) setTimeout(onDone, 900);
      }, i * 120 + random(0, 60));
    });
  }

  settle() {
    const { width } = this.#metrics;
    this.#items.forEach((item, i) => {
      const x = clamp(((i + 0.5) / this.#items.length) * width + random(-20, 20), item.width / 2 + 4, width - item.width / 2 - 4);
      this.#addBody(item, x, this.groundY(x) - item.height - 40 - (i % 3) * 90, random(-0.3, 0.3));
      item.element.style.visibility = "visible";
    });
    for (let i = 0; i < SETTLE_STEPS; i++) this.#matter.Engine.update(this.#engine, STEP);
    this.#items.forEach((item) => this.render(item));
  }

  groundY(x) {
    const geometry = this.#folders.geometry;
    let best = Infinity;
    this.#folders.groundIds.forEach((id) => {
      const edge = geometry.folders[id].edge;
      for (let i = 0; i < edge.length - 1; i++) {
        const [ax, ay] = edge[i];
        const [bx, by] = edge[i + 1];
        if (bx !== ax && x >= Math.min(ax, bx) && x <= Math.max(ax, bx)) {
          best = Math.min(best, ay + ((x - ax) / (bx - ax)) * (by - ay));
        }
      }
    });
    return this.#metrics.height - geometry.height + (best === Infinity ? 0 : best);
  }

  setWidth(item, width) {
    item.width = width;
    if (!item.body) return;
    this.#matter.Body.setVertices(item.body, this.#pillVertices(width, item.height, item.body.angle));
    this.#matter.Sleeping.set(item.body, false);
  }

  lift(id) {
    this.#folders.groundIds.forEach((key) => {
      this.#liftTarget[key] = key === id ? 16 * this.#metrics.unit : 0;
    });
    this.#items.forEach((item) => item.body && this.#matter.Sleeping.set(item.body, false));
  }

  grab(key, item, point) {
    const { Constraint, Composite, Sleeping } = this.#matter;
    const body = item.body;
    if (!body) return;
    this.release(key);
    Sleeping.set(body, false);
    const constraint = Constraint.create({
      pointA: { x: point.x, y: point.y },
      bodyB: body,
      pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
      stiffness: 0.2,
      damping: 0.08,
      length: 0,
    });
    body.frictionAir = 0.06;
    Composite.add(this.#world, constraint);
    this.#grabs.set(key, { constraint, item });
  }

  move(key, point) {
    const grab = this.#grabs.get(key);
    if (!grab) return;
    const { width, height } = this.#metrics;
    grab.constraint.pointA.x = clamp(point.x, 0, width);
    grab.constraint.pointA.y = clamp(point.y, -height * 0.5, height);
    this.#matter.Sleeping.set(grab.item.body, false);
  }

  release(key) {
    const grab = this.#grabs.get(key);
    if (!grab) return;
    this.#matter.Composite.remove(this.#world, grab.constraint);
    grab.item.body.frictionAir = 0.012;
    this.#grabs.delete(key);
  }

  hop(item, power = 1) {
    const { Body, Sleeping } = this.#matter;
    const body = item.body;
    if (!body) return;
    Sleeping.set(body, false);
    Body.setVelocity(body, { x: body.velocity.x + random(-1, 1), y: -6.5 * power * Math.sqrt(this.#metrics.unit) });
    Body.setAngularVelocity(body, random(-0.12, 0.12) * power);
  }

  render(item) {
    const body = item.body;
    if (!body) return;
    let angle = body.angle;
    if (item.isPill) angle = ((((angle + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
    const x = (body.position.x - item.width / 2).toFixed(2);
    const y = (body.position.y - item.height / 2).toFixed(2);
    item.element.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle.toFixed(4)}rad)`;
  }

  tick(dt) {
    this.#easeLifts(dt);
    this.#accumulator += dt;
    let steps = 0;
    while (this.#accumulator >= STEP && steps < 4) {
      this.#matter.Engine.update(this.#engine, STEP);
      this.#accumulator -= STEP;
      steps++;
    }
    if (steps === 4) this.#accumulator = 0;
    this.#items.forEach((item) => {
      if (item.body && (!item.body.isSleeping || item.resize)) this.render(item);
    });
  }

  relayout(previous, measure) {
    const { Body, Sleeping } = this.#matter;
    const { width, height, unit } = this.#metrics;
    const scale = unit / previous.unit;
    this.buildStatics();
    this.#items.forEach((item) => {
      const body = item.body;
      const previousWidth = item.width;
      measure(item);
      if (!body) return;
      if (item.isPill) Body.setVertices(body, this.#pillVertices(item.width, item.height, body.angle));
      else if (Math.abs(scale - 1) > 0.001) Body.scale(body, item.width / previousWidth, item.width / previousWidth);
      const x = clamp((body.position.x / (previous.width || 1)) * width, item.width / 2 + 4, width - item.width / 2 - 4);
      const fromBottom = (previous.height - body.position.y) * scale;
      Body.setPosition(body, { x, y: Math.min(height - fromBottom, this.groundY(x) - item.height / 2 - 2) });
      Body.setVelocity(body, { x: 0, y: 0 });
      Sleeping.set(body, false);
      this.render(item);
    });
  }

  #easeLifts(dt) {
    const easing = 1 - Math.exp(-dt / 80);
    Object.keys(this.#ground).forEach((id) => {
      const target = this.#liftTarget[id] || 0;
      const current = this.#liftOffset[id] || 0;
      if (current === target) return;
      const next = Math.abs(target - current) < 0.05 ? target : current + (target - current) * easing;
      this.#liftOffset[id] = next;
      this.#ground[id].forEach((segment) => {
        this.#matter.Body.setPosition(segment, { x: segment.plugin.base.x, y: segment.plugin.base.y - next }, true);
      });
    });
  }

  #limitSpeeds() {
    const { Body } = this.#matter;
    this.#items.forEach(({ body }) => {
      if (!body || body.isSleeping) return;
      const { x, y } = body.velocity;
      const speed = Math.hypot(x, y);
      if (speed > MAX_SPEED) Body.setVelocity(body, { x: (x / speed) * MAX_SPEED, y: (y / speed) * MAX_SPEED });
      if (Math.abs(body.angularVelocity) > MAX_SPIN) Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * MAX_SPIN);
    });
  }

  #segment(from, to, thickness) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    if (length < 0.5) return null;
    const nx = -dy / length;
    const ny = dx / length;
    const cx = (from[0] + to[0]) / 2 + (nx * thickness) / 2;
    const cy = (from[1] + to[1]) / 2 + (ny * thickness) / 2;
    return this.#matter.Bodies.rectangle(cx, cy, length + 3, thickness, {
      isStatic: true,
      angle: Math.atan2(dy, dx),
      friction: 0.6,
      restitution: 0.1,
    });
  }

  #addBody(item, x, y, angle) {
    const { Bodies, Composite } = this.#matter;
    const options = { angle, restitution: 0.28, friction: 0.35, frictionStatic: 0.6, frictionAir: 0.012, density: 0.0018, sleepThreshold: 50 };
    const body = item.isPill
      ? Bodies.rectangle(x, y, item.width, item.height, { ...options, chamfer: { radius: item.height / 2 - 0.5 } })
      : Bodies.circle(x, y, item.width / 2, { ...options, restitution: 0.42, friction: 0.25, density: 0.0016 }, 28);
    body.plugin.item = item;
    item.body = body;
    Composite.add(this.#world, body);
    return body;
  }

  #pillVertices(width, height, angle) {
    const shape = this.#matter.Bodies.rectangle(0, 0, width, height, { chamfer: { radius: height / 2 - 0.5 } });
    const vertices = shape.vertices.map(({ x, y }) => ({ x, y }));
    this.#matter.Vertices.rotate(vertices, angle, { x: 0, y: 0 });
    return vertices;
  }
}
