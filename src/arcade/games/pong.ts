import { info } from '../catalog';
import { C, clamp, clear, Floaters, GameDef, GameInstance, Input, Particles, PointerEvt, rand, sfx, Shake, text, TAU } from '../core';

const W = 640;
const H = 400;
const PW = 10;
const PH = 70;
const R = 6;
const TO = 7;

class Pong implements GameInstance {
  py = H / 2 - PH / 2;
  cy = H / 2 - PH / 2;
  cvy = 0;
  ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  trail: { x: number; y: number }[] = [];
  p = 0;
  c = 0;
  rally = 0;
  longest = 0;
  hits = 0;
  serveIn = 1.2;
  serveDir = 1;
  pointerY: number | null = null;
  over = false;
  won = false;
  ending = 0;
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();
  aim = H / 2;
  think = 0;

  get score() {
    return this.p * 100 + this.hits * 5 + (this.won ? 500 : 0);
  }

  hud(): [string, string | number][] {
    return [['YOU', this.p], ['CPU', this.c], ['RALLY', this.rally]];
  }

  pointer(e: PointerEvt) {
    if (e.kind === 'up' && e.pointerType !== 'mouse') this.pointerY = null;
    else this.pointerY = e.y;
  }

  serve() {
    const a = rand(-0.5, 0.5);
    const speed = 300;
    this.ball = { x: W / 2, y: H / 2, vx: Math.cos(a) * speed * this.serveDir, vy: Math.sin(a) * speed };
    this.rally = 0;
    this.trail = [];
    sfx.blip(520);
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    this.shake.update(dt);
    if (this.ending > 0) {
      this.ending -= dt;
      if (this.ending <= 0) this.over = true;
      return;
    }

    // player: keys move at a fixed speed, pointer follows directly
    const speed = 460;
    if (input.isDown('up')) { this.py -= speed * dt; this.pointerY = null; }
    if (input.isDown('down')) { this.py += speed * dt; this.pointerY = null; }
    if (this.pointerY !== null) this.py += (this.pointerY - PH / 2 - this.py) * Math.min(1, dt * 18);
    this.py = clamp(this.py, 0, H - PH);

    // cpu: re-aims a few times a second at a predicted intercept, gets sharper as you lead
    const skill = clamp(0.55 + (this.p - this.c) * 0.06 + this.p * 0.02, 0.45, 0.92);
    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.12 + (1 - skill) * 0.25;
      if (this.ball.vx > 0) {
        let t = (W - 24 - this.ball.x) / this.ball.vx;
        let y = this.ball.y + this.ball.vy * t;
        // fold reflections off top/bottom
        const span = H - R * 2;
        y = ((y - R) % (2 * span) + 2 * span) % (2 * span);
        y = (y > span ? 2 * span - y : y) + R;
        this.aim = y + rand(-1, 1) * (1 - skill) * 90;
      } else {
        this.aim = H / 2;
      }
    }
    const maxV = 250 + skill * 250;
    const target = this.aim - PH / 2 - this.cy;
    this.cvy = clamp(target * 8, -maxV, maxV);
    this.cy = clamp(this.cy + this.cvy * dt, 0, H - PH);

    if (this.serveIn > 0) {
      this.serveIn -= dt;
      if (this.serveIn <= 0) this.serve();
      return;
    }

    const b = this.ball;
    // substep so fast balls can't tunnel through paddles
    const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 6);
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); sfx.tick(); }
      if (b.y > H - R) { b.y = H - R; b.vy = -Math.abs(b.vy); sfx.tick(); }

      if (b.vx < 0 && b.x - R <= 24 + PW && b.x - R >= 24 - 4 && b.y >= this.py - R && b.y <= this.py + PH + R) {
        this.bounce(this.py, 1, C.green);
        this.hits++;
      }
      if (b.vx > 0 && b.x + R >= W - 24 - PW && b.x + R <= W - 24 + 4 && b.y >= this.cy - R && b.y <= this.cy + PH + R) {
        this.bounce(this.cy, -1, C.red);
      }
      if (b.x < -20 || b.x > W + 20) {
        this.point(b.x > W);
        return;
      }
    }
    this.trail.push({ x: b.x, y: b.y });
    if (this.trail.length > 14) this.trail.shift();
  }

  bounce(paddleY: number, dir: 1 | -1, color: string) {
    const b = this.ball;
    const off = clamp((b.y - (paddleY + PH / 2)) / (PH / 2), -1, 1);
    const speed = Math.min(900, Math.hypot(b.vx, b.vy) * 1.06);
    const angle = off * 1.05;
    b.vx = Math.cos(angle) * speed * dir;
    b.vy = Math.sin(angle) * speed;
    b.x = dir === 1 ? 24 + PW + R : W - 24 - PW - R;
    this.rally++;
    this.longest = Math.max(this.longest, this.rally);
    this.fx.burst(b.x, b.y, color, 10, 180);
    this.shake.kick(Math.min(5, speed / 180), 0.12);
    sfx.hit(dir === 1 ? 520 : 440);
  }

  point(player: boolean) {
    const b = this.ball;
    const x = player ? W - 10 : 10;
    this.fx.burst(x, clamp(b.y, 10, H - 10), player ? C.green : C.red, 40, 300);
    this.shake.kick(10, 0.35);
    if (player) {
      this.p++;
      this.floaters.add(W / 2, H / 2 - 40, 'POINT!', C.green);
      sfx.coin();
    } else {
      this.c++;
      sfx.thud();
    }
    this.serveDir = player ? -1 : 1;
    this.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    this.trail = [];
    if (this.p >= TO || this.c >= TO) {
      this.won = this.p >= TO;
      this.ending = 1.2;
      this.won ? sfx.win() : sfx.lose();
    } else {
      this.serveIn = 0.9;
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H);
    ctx.save();
    this.shake.apply(ctx);

    // court
    ctx.fillStyle = C.grid;
    for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 2, y, 4, 12);
    text(ctx, String(this.p), W / 2 - 70, 56, { size: 56, color: C.line, weight: 700 });
    text(ctx, String(this.c), W / 2 + 70, 56, { size: 56, color: C.line, weight: 700 });
    text(ctx, `FIRST TO ${TO}`, W / 2, H - 16, { size: 11, color: C.dim });

    // paddles
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = C.green;
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.roundRect(24, this.py, PW, PH, 4);
    ctx.fill();
    ctx.shadowColor = C.red;
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.roundRect(W - 24 - PW, this.cy, PW, PH, 4);
    ctx.fill();
    ctx.restore();

    // ball + trail
    const b = this.ball;
    if (b.vx !== 0) {
      this.trail.forEach((p, i) => {
        ctx.globalAlpha = (i / this.trail.length) * 0.35;
        ctx.fillStyle = C.sky;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R * (i / this.trail.length), 0, TAU);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = C.bright;
      ctx.fillStyle = C.bright;
      ctx.beginPath();
      ctx.arc(b.x, b.y, R, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (this.serveIn > 0 && this.ending <= 0) {
      text(ctx, String(Math.ceil(this.serveIn / 0.4)), W / 2, H / 2, { size: 36, color: C.yellow, weight: 700, glow: 12 });
    }

    if (this.rally >= 5) text(ctx, `RALLY ×${this.rally}`, W / 2, 104, { size: 13, color: C.peach, weight: 700, glow: 8 + Math.sin(t * 10) * 4 });
    if (this.ending > 0) text(ctx, this.won ? 'YOU WIN' : 'CPU WINS', W / 2, H / 2, { size: 44, color: this.won ? C.green : C.red, weight: 700, glow: 20 });

    this.fx.draw(ctx);
    this.floaters.draw(ctx, 22);
    ctx.restore();
  }
}

export const pong: GameDef = {
  ...info('pong'),
  controls: 'W/S · ↑/↓ · MOUSE',
  color: C.sky,
  width: W,
  height: H,
  icon: ['........', '#.......', '#.......', '#....#..', '#......#', '.......#', '.......#', '........'],
  touch: { pointer: 'DRAG TO MOVE' },
  storageKey: 'arcade-pong-best',
  create: () => new Pong(),
};
