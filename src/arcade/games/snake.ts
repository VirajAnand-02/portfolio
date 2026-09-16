import { info } from '../catalog';
import { C, clear, dotGrid, Floaters, GameDef, GameInstance, Input, Particles, randInt, sfx, Shake, TAU } from '../core';

const N = 24;
const CELL = 20;
const SIZE = N * CELL;

type P = { x: number; y: number };

class Snake implements GameInstance {
  snake: P[] = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
  prev: P[] = this.snake.map((s) => ({ ...s }));
  dir: P = { x: 1, y: 0 };
  queue: P[] = [];
  food: P = { x: 16, y: 12 };
  bonus: (P & { ttl: number }) | null = null;
  eaten = 0;
  score = 0;
  over = false;
  step = 0.13;
  acc = 0;
  grow = 0;
  dying = 0;
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();

  free(): P {
    for (;;) {
      const p = { x: randInt(0, N - 1), y: randInt(0, N - 1) };
      const taken = this.snake.some((s) => s.x === p.x && s.y === p.y) || (this.food.x === p.x && this.food.y === p.y) || (this.bonus && this.bonus.x === p.x && this.bonus.y === p.y);
      if (!taken) return p;
    }
  }

  steer(input: Input) {
    const want: [string, P][] = [['up', { x: 0, y: -1 }], ['down', { x: 0, y: 1 }], ['left', { x: -1, y: 0 }], ['right', { x: 1, y: 0 }]];
    for (const [k, d] of want) {
      if (!input.pressed(k)) continue;
      // queue turns so quick double-taps (e.g. up→left) register on consecutive steps
      const last = this.queue[this.queue.length - 1] ?? this.dir;
      if (last.x + d.x === 0 && last.y + d.y === 0) continue;
      if (last.x === d.x && last.y === d.y) continue;
      if (this.queue.length < 3) this.queue.push(d);
    }
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    this.shake.update(dt);
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.over = true;
      return;
    }
    this.steer(input);
    if (this.bonus) {
      this.bonus.ttl -= dt;
      if (this.bonus.ttl <= 0) this.bonus = null;
    }
    this.acc += dt;
    while (this.acc >= this.step && this.dying <= 0) {
      this.acc -= this.step;
      this.tick();
    }
  }

  tick() {
    if (this.queue.length) this.dir = this.queue.shift()!;
    this.prev = this.snake.map((s) => ({ ...s }));
    const head = this.snake[0];
    const next = { x: head.x + this.dir.x, y: head.y + this.dir.y };
    // the tail moves out of the way this tick unless we are growing
    const body = this.grow > 0 ? this.snake : this.snake.slice(0, -1);
    if (next.x < 0 || next.y < 0 || next.x >= N || next.y >= N || body.some((s) => s.x === next.x && s.y === next.y)) {
      this.die();
      return;
    }
    // segment i slides from old segment i's cell; a growing tail stays put
    this.snake.unshift(next);
    if (this.grow > 0) {
      this.grow--;
      this.prev.push({ ...this.prev[this.prev.length - 1] });
    } else this.snake.pop();

    const cx = next.x * CELL + CELL / 2;
    const cy = next.y * CELL + CELL / 2;
    if (next.x === this.food.x && next.y === this.food.y) {
      this.eaten++;
      this.grow += 1;
      const pts = 10;
      this.score += pts;
      this.floaters.add(cx, cy - 10, `+${pts}`, C.green);
      this.fx.burst(cx, cy, C.red, 14, 140);
      sfx.blip(660 + Math.min(this.eaten, 30) * 12);
      this.food = this.free();
      this.step = Math.max(0.055, 0.13 - this.eaten * 0.0025);
      if (!this.bonus && this.eaten % 5 === 0) this.bonus = { ...this.free(), ttl: 6 };
    } else if (this.bonus && next.x === this.bonus.x && next.y === this.bonus.y) {
      const pts = 20 + Math.ceil(this.bonus.ttl) * 10;
      this.score += pts;
      this.grow += 3;
      this.floaters.add(cx, cy - 10, `+${pts}`, C.yellow);
      this.fx.burst(cx, cy, C.yellow, 24, 200);
      sfx.coin();
      this.bonus = null;
    }
  }

  die() {
    this.dying = 0.8;
    this.shake.kick(8, 0.4);
    sfx.boom(0.6);
    for (const s of this.snake) this.fx.burst(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, C.green, 4, 120);
  }

  hud(): [string, string | number][] {
    return [['LENGTH', this.snake.length]];
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, SIZE, SIZE);
    ctx.save();
    this.shake.apply(ctx);
    dotGrid(ctx, SIZE, SIZE, CELL);

    // food
    const pulse = 1 + Math.sin(t * 8) * 0.12;
    const fx = this.food.x * CELL + CELL / 2;
    const fy = this.food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = C.red;
    ctx.shadowBlur = 14;
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(fx, fy, 6.5 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.green;
    ctx.fillRect(fx - 1, fy - 10, 2, 4);

    if (this.bonus) {
      const bx = this.bonus.x * CELL + CELL / 2;
      const by = this.bonus.y * CELL + CELL / 2;
      const blink = this.bonus.ttl < 2 && Math.floor(t * 10) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(t * 3);
        ctx.shadowColor = C.yellow;
        ctx.shadowBlur = 18;
        ctx.fillStyle = C.yellow;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 4 : 9;
          const a = (i / 10) * TAU;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.fill();
        ctx.restore();
      }
    }

    // snake: interpolate between ticks for smooth motion
    const k = this.dying > 0 ? 1 : Math.min(1, this.acc / this.step);
    const n = this.snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const cur = this.snake[i];
      const from = this.prev[i] ?? cur;
      const x = (from.x + (cur.x - from.x) * k) * CELL;
      const y = (from.y + (cur.y - from.y) * k) * CELL;
      const shade = i === 0 ? C.teal : i % 2 ? C.green : '#8fd887';
      const inset = i === 0 ? 1 : 2 + Math.min(3, (i / n) * 3);
      if (this.dying > 0 && Math.floor(this.dying * 12) % 2 === 0) ctx.fillStyle = C.red;
      else ctx.fillStyle = shade;
      if (i === 0) {
        ctx.save();
        ctx.shadowColor = C.teal;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.roundRect(x + inset, y + inset, CELL - inset * 2, CELL - inset * 2, i === 0 ? 6 : 4);
      ctx.fill();
      if (i === 0) {
        ctx.restore();
        // eyes look where we're going
        const d = this.queue[0] ?? this.dir;
        const ex = x + CELL / 2 + d.x * 4;
        const ey = y + CELL / 2 + d.y * 4;
        ctx.fillStyle = C.crust;
        const ox = d.y !== 0 ? 4 : 0;
        const oy = d.x !== 0 ? 4 : 0;
        ctx.fillRect(ex - ox - 1.5, ey - oy - 1.5, 3, 3);
        ctx.fillRect(ex + ox - 1.5, ey + oy - 1.5, 3, 3);
      }
    }

    this.fx.draw(ctx);
    this.floaters.draw(ctx);
    ctx.restore();
  }
}

export const snake: GameDef = {
  ...info('snake'),
  controls: 'ARROWS / WASD',
  color: C.green,
  width: SIZE,
  height: SIZE,
  icon: ['........', '.####...', '.#..#...', '.#..###.', '.#....#.', '.####.#.', '......#.', '..#...#.'],
  touch: { dpad: 'full' },
  storageKey: 'arcade-snake-high',
  create: () => new Snake(),
};
