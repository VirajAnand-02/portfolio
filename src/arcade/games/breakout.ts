import { info } from '../catalog';
import { C, clamp, clear, Floaters, GameDef, GameInstance, Input, Particles, pick, PointerEvt, RAINBOW, rand, sfx, Shake, text, TAU } from '../core';

const W = 480;
const H = 600;
const BW = 40;
const BH = 16;
const TOP = 70;
const COLS = 11;

type Brick = { x: number; y: number; hp: number; max: number; color: string; flash: number };
type Ball = { x: number; y: number; vx: number; vy: number; stuck: boolean };
type Drop = { x: number; y: number; kind: PowerKind };
type PowerKind = 'wide' | 'multi' | 'slow' | 'life' | 'laser';

const POWER: Record<PowerKind, { color: string; label: string }> = {
  wide: { color: C.sky, label: 'W' },
  multi: { color: C.mauve, label: 'M' },
  slow: { color: C.teal, label: 'S' },
  life: { color: C.red, label: '♥' },
  laser: { color: C.peach, label: 'L' },
};

// '.' empty, digit = hp (9 = unbreakable)
const LAYOUTS = [
  ['...........', '11111111111', '11111111111', '22222222222', '11111111111', '11111111111'],
  ['2.........2', '12.......21', '112.....211', '1112...2111', '11112.21111', '11111911111'],
  ['..1111111..', '.122222221.', '12233333221', '12233333221', '.122222221.', '..1111111..'],
  ['1.1.1.1.1.1', '.2.2.2.2.2.', '1.1.1.1.1.1', '99.99999.99', '22222222222', '33333333333'],
  ['33333333333', '2.........2', '2.1111111.2', '2.1.333.1.2', '2.1111111.2', '99999.99999'],
];

const SPEED = 330;

class Breakout implements GameInstance {
  bricks: Brick[] = [];
  balls: Ball[] = [];
  drops: Drop[] = [];
  lasers: { x: number; y: number }[] = [];
  px = W / 2;
  pw = 84;
  wideT = 0;
  slowT = 0;
  laserT = 0;
  laserCd = 0;
  lives = 3;
  level = 0;
  score = 0;
  combo = 0;
  over = false;
  won = false;
  pointerX: number | null = null;
  banner = 0;
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();

  constructor() {
    this.build();
  }

  build() {
    const rows = LAYOUTS[this.level % LAYOUTS.length];
    const loop = Math.floor(this.level / LAYOUTS.length);
    this.bricks = [];
    const ox = (W - COLS * BW) / 2;
    rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const hp = ch === '9' ? Infinity : Math.min(4, Number(ch) + loop);
        this.bricks.push({ x: ox + c * BW, y: TOP + r * BH, hp, max: hp, color: hp === Infinity ? C.dim : RAINBOW[(r + this.level) % RAINBOW.length], flash: 0 });
      })
    );
    this.drops = [];
    this.lasers = [];
    this.resetBall();
    this.banner = 1.6;
  }

  resetBall() {
    this.balls = [{ x: this.px, y: H - 48, vx: 0, vy: 0, stuck: true }];
  }

  pointer(e: PointerEvt) {
    this.pointerX = e.x;
    if (e.kind === 'down') this.launch();
  }

  launch() {
    let launched = false;
    for (const b of this.balls) {
      if (!b.stuck) continue;
      const a = -Math.PI / 2 + rand(-0.35, 0.35);
      const s = this.ballSpeed();
      b.vx = Math.cos(a) * s;
      b.vy = Math.sin(a) * s;
      b.stuck = false;
      launched = true;
    }
    if (launched) sfx.blip(620);
  }

  ballSpeed() {
    return (SPEED + this.level * 18) * (this.slowT > 0 ? 0.7 : 1);
  }

  hud(): [string, string | number][] {
    return [['LEVEL', this.level + 1], ['LIVES', '♥'.repeat(Math.max(0, this.lives))]];
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    this.shake.update(dt);
    this.banner = Math.max(0, this.banner - dt);
    for (const br of this.bricks) br.flash = Math.max(0, br.flash - dt);

    const move = 520 * dt;
    if (input.isDown('left')) { this.px -= move; this.pointerX = null; }
    if (input.isDown('right')) { this.px += move; this.pointerX = null; }
    if (this.pointerX !== null) this.px += (this.pointerX - this.px) * Math.min(1, dt * 20);
    const target = this.wideT > 0 ? 132 : 84;
    this.pw += (target - this.pw) * Math.min(1, dt * 10);
    this.px = clamp(this.px, this.pw / 2, W - this.pw / 2);
    if (input.pressed('a') || input.pressed('up')) this.launch();

    this.wideT = Math.max(0, this.wideT - dt);
    this.laserT = Math.max(0, this.laserT - dt);
    const wasSlow = this.slowT > 0;
    this.slowT = Math.max(0, this.slowT - dt);
    if (wasSlow && this.slowT === 0) this.respeed();

    // lasers auto-fire while active
    if (this.laserT > 0) {
      this.laserCd -= dt;
      if (this.laserCd <= 0) {
        this.laserCd = 0.28;
        this.lasers.push({ x: this.px - this.pw / 2 + 6, y: H - 40 }, { x: this.px + this.pw / 2 - 6, y: H - 40 });
        sfx.shoot();
      }
    }
    for (const l of this.lasers) {
      l.y -= 700 * dt;
      const hit = this.bricks.find((b) => l.x >= b.x && l.x <= b.x + BW && l.y >= b.y && l.y <= b.y + BH);
      if (hit) {
        this.damage(hit);
        l.y = -100;
      }
    }
    this.lasers = this.lasers.filter((l) => l.y > -20);

    for (const b of this.balls) {
      if (b.stuck) {
        b.x = this.px;
        b.y = H - 48;
        continue;
      }
      const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 5);
      for (let i = 0; i < steps; i++) this.stepBall(b, dt / steps);
    }
    const before = this.balls.length;
    this.balls = this.balls.filter((b) => b.y < H + 20);
    if (before && !this.balls.length) this.loseLife();

    for (const d of this.drops) {
      d.y += 150 * dt;
      if (d.y > H - 42 && d.y < H - 20 && Math.abs(d.x - this.px) < this.pw / 2 + 10) {
        this.collect(d.kind);
        d.y = H + 100;
      }
    }
    this.drops = this.drops.filter((d) => d.y < H + 20);

    if (!this.bricks.some((b) => b.hp !== Infinity)) {
      this.score += 1000 + this.lives * 250;
      this.floaters.add(W / 2, H / 2, 'STAGE CLEAR', C.green);
      sfx.win();
      this.level++;
      this.build();
    }
  }

  stepBall(b: Ball, h: number) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx); sfx.tick(); }
    if (b.x > W - 6) { b.x = W - 6; b.vx = -Math.abs(b.vx); sfx.tick(); }
    if (b.y < 6) { b.y = 6; b.vy = Math.abs(b.vy); sfx.tick(); }

    // paddle: bounce angle follows where the ball lands
    const py = H - 40;
    if (b.vy > 0 && b.y + 6 >= py && b.y + 6 <= py + 12 && Math.abs(b.x - this.px) <= this.pw / 2 + 6) {
      const off = clamp((b.x - this.px) / (this.pw / 2), -1, 1);
      const a = -Math.PI / 2 + off * 1.1;
      const s = this.ballSpeed();
      b.vx = Math.cos(a) * s;
      b.vy = Math.sin(a) * s;
      b.y = py - 6;
      this.combo = 0;
      sfx.hit(330);
      this.fx.burst(b.x, py, C.text, 6, 90);
    }

    for (const br of this.bricks) {
      if (br.hp <= 0) continue;
      if (b.x + 6 < br.x || b.x - 6 > br.x + BW || b.y + 6 < br.y || b.y - 6 > br.y + BH) continue;
      // resolve along the axis of least penetration
      const ox = Math.min(b.x + 6 - br.x, br.x + BW - (b.x - 6));
      const oy = Math.min(b.y + 6 - br.y, br.y + BH - (b.y - 6));
      if (ox < oy) {
        b.vx = b.x < br.x + BW / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
        b.x += b.vx > 0 ? ox : -ox;
      } else {
        b.vy = b.y < br.y + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
        b.y += b.vy > 0 ? oy : -oy;
      }
      this.damage(br);
      break;
    }
  }

  damage(br: Brick) {
    br.flash = 0.12;
    if (br.hp === Infinity) {
      sfx.tick();
      return;
    }
    br.hp--;
    const cx = br.x + BW / 2;
    const cy = br.y + BH / 2;
    if (br.hp > 0) {
      sfx.hit(520);
      return;
    }
    this.combo++;
    const pts = 50 * br.max * Math.min(this.combo, 8);
    this.score += pts;
    if (this.combo > 1) this.floaters.add(cx, cy, `+${pts}`, C.yellow);
    this.fx.burst(cx, cy, br.color, 14, 170, { gravity: 300 });
    this.shake.kick(2, 0.08);
    sfx.blip(500 + Math.min(this.combo, 12) * 60);
    this.bricks = this.bricks.filter((b) => b !== br);
    if (Math.random() < 0.13) this.drops.push({ x: cx, y: cy, kind: pick(['wide', 'multi', 'slow', 'laser', 'wide', 'multi', 'life'] as PowerKind[]) });
  }

  collect(kind: PowerKind) {
    sfx.power();
    this.floaters.add(this.px, H - 60, { wide: 'WIDE', multi: 'MULTIBALL', slow: 'SLOW', life: '+1 LIFE', laser: 'LASERS' }[kind], POWER[kind].color);
    this.score += 100;
    if (kind === 'wide') this.wideT = 12;
    if (kind === 'life') this.lives = Math.min(5, this.lives + 1);
    if (kind === 'laser') this.laserT = 8;
    if (kind === 'slow') {
      this.slowT = 8;
      this.respeed();
    }
    if (kind === 'multi') {
      const src = this.balls.find((b) => !b.stuck) ?? this.balls[0];
      if (!src) return;
      for (const da of [-0.5, 0.5]) {
        const a = Math.atan2(src.vy || -1, src.vx) + da;
        const s = this.ballSpeed();
        this.balls.push({ x: src.x, y: src.stuck ? H - 60 : src.y, vx: Math.cos(a) * s, vy: -Math.abs(Math.sin(a) * s), stuck: false });
      }
    }
  }

  respeed() {
    const s = this.ballSpeed();
    for (const b of this.balls) {
      const cur = Math.hypot(b.vx, b.vy);
      if (cur > 0) {
        b.vx = (b.vx / cur) * s;
        b.vy = (b.vy / cur) * s;
      }
    }
  }

  loseLife() {
    this.lives--;
    this.shake.kick(10, 0.4);
    this.fx.burst(this.px, H - 40, C.red, 30, 240);
    this.wideT = this.slowT = this.laserT = 0;
    this.drops = [];
    if (this.lives <= 0) {
      this.over = true;
      sfx.lose();
    } else {
      sfx.thud();
      this.resetBall();
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H);
    ctx.save();
    this.shake.apply(ctx);

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H + 10);

    for (const br of this.bricks) {
      const color = br.flash > 0 ? C.bright : br.color;
      ctx.fillStyle = color;
      ctx.globalAlpha = br.hp === Infinity ? 1 : 0.55 + 0.45 * (br.hp / br.max);
      ctx.beginPath();
      ctx.roundRect(br.x + 2, br.y + 2, BW - 4, BH - 4, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (br.hp === Infinity) {
        ctx.strokeStyle = C.muted;
        ctx.lineWidth = 1;
        ctx.strokeRect(br.x + 5.5, br.y + 5.5, BW - 11, BH - 11);
      } else if (br.max > 1) {
        ctx.fillStyle = C.crust;
        for (let i = 0; i < br.hp; i++) ctx.fillRect(br.x + 8 + i * 7, br.y + BH / 2 - 1, 4, 2);
      }
    }

    for (const d of this.drops) {
      const p = POWER[d.kind];
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(d.x - 14, d.y - 8, 28, 16, 8);
      ctx.fill();
      ctx.restore();
      text(ctx, p.label, d.x, d.y + 1, { size: 11, color: C.crust, weight: 700 });
    }

    ctx.fillStyle = C.peach;
    for (const l of this.lasers) ctx.fillRect(l.x - 1.5, l.y - 8, 3, 12);

    // paddle
    ctx.save();
    const pc = this.laserT > 0 ? C.peach : this.wideT > 0 ? C.sky : C.green;
    ctx.shadowColor = pc;
    ctx.shadowBlur = 16;
    ctx.fillStyle = pc;
    ctx.beginPath();
    ctx.roundRect(this.px - this.pw / 2, H - 40, this.pw, 12, 6);
    ctx.fill();
    ctx.restore();

    for (const b of this.balls) {
      ctx.save();
      ctx.shadowColor = this.slowT > 0 ? C.teal : C.bright;
      ctx.shadowBlur = 14;
      ctx.fillStyle = this.slowT > 0 ? C.teal : C.bright;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (this.balls.some((b) => b.stuck)) text(ctx, 'SPACE / TAP TO LAUNCH', W / 2, H - 90, { size: 12, color: C.muted, glow: 4 + Math.sin(t * 5) * 3 });
    if (this.banner > 0) {
      ctx.globalAlpha = Math.min(1, this.banner * 2);
      text(ctx, `STAGE ${this.level + 1}`, W / 2, H / 2 + 40, { size: 34, color: C.yellow, weight: 700, glow: 16 });
      ctx.globalAlpha = 1;
    }

    this.fx.draw(ctx);
    this.floaters.draw(ctx);
    ctx.restore();
  }
}

export const breakout: GameDef = {
  ...info('breakout'),
  controls: '←/→ · MOUSE · SPACE LAUNCH',
  color: C.peach,
  width: W,
  height: H,
  icon: ['########', '#.####.#', '########', '........', '....#...', '........', '........', '..####..'],
  touch: { pointer: 'DRAG · TAP TO LAUNCH' },
  storageKey: 'arcade-breakout-high',
  create: () => new Breakout(),
};
