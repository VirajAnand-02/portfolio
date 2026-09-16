import { info } from '../catalog';
import { C, clamp, clear, Floaters, GameDef, GameInstance, Input, Particles, PointerEvt, rand, sfx, Shake, sprite, text } from '../core';

const W = 400;
const H = 600;
const GROUND = H - 60;
const PX = 3;

// a nod to FlappyMatrix — the same bird, drawn at 3px on an "LED" grid
const BIRD = [
  ['...####...', '..#....#..', '.#...#.##.', '######..#.', '#.....####', '######...#', '.#......#.', '..######..'],
  ['...####...', '..#....#..', '.#...#.##.', '.#....#.#.', '######.###', '#.....#..#', '######..#.', '..######..'],
];

type Pipe = { x: number; gap: number; size: number; scored: boolean };

class Flappy implements GameInstance {
  y = H / 2 - 40;
  vy = 0;
  pipes: Pipe[] = [];
  score = 0;
  over = false;
  started = false;
  dead = 0;
  scroll = 0;
  flapT = 0;
  flashT = 0;
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();
  city = Array.from({ length: 24 }, (_, i) => ({ x: i * 34, h: rand(40, 150), lit: Array.from({ length: 12 }, () => Math.random() < 0.3) }));

  pointer(e: PointerEvt) {
    if (e.kind === 'down') this.flap();
  }

  flap() {
    if (this.dead > 0) return;
    this.started = true;
    this.vy = -330;
    this.flapT = 0.15;
    sfx.jump();
    this.fx.burst(92, this.y + 14, C.text, 4, 60, { life: 0.3, size: 2 });
  }

  spawnPipe(x: number) {
    const size = clamp(170 - this.score * 2.2, 118, 170);
    this.pipes.push({ x, gap: rand(90 + size / 2, GROUND - 60 - size / 2), size, scored: false });
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    this.shake.update(dt);
    this.flapT = Math.max(0, this.flapT - dt);
    this.flashT = Math.max(0, this.flashT - dt);

    if (input.pressed('a') || input.pressed('up')) this.flap();

    if (!this.started) {
      this.y = H / 2 - 40 + Math.sin(performance.now() / 250) * 8;
      this.scroll += 90 * dt;
      return;
    }

    this.vy = Math.min(560, this.vy + 1250 * dt);
    this.y += this.vy * dt;

    if (this.dead > 0) {
      this.dead -= dt;
      if (this.y > GROUND - 24) {
        this.y = GROUND - 24;
        this.vy = 0;
      }
      if (this.dead <= 0) this.over = true;
      return;
    }

    const speed = 150 + Math.min(this.score, 40) * 2.5;
    this.scroll += speed * dt;
    if (!this.pipes.length) this.spawnPipe(W + 40);
    for (const p of this.pipes) p.x -= speed * dt;
    const last = this.pipes[this.pipes.length - 1];
    if (last.x < W - 210) this.spawnPipe(last.x + 210);
    this.pipes = this.pipes.filter((p) => p.x > -80);

    const bx = 78;
    const bw = 30;
    const bh = 24;
    for (const p of this.pipes) {
      if (!p.scored && p.x + 64 < bx) {
        p.scored = true;
        this.score++;
        sfx.coin();
        if (this.score % 10 === 0) {
          this.floaters.add(W / 2, 140, `${this.score}!`, C.yellow);
          this.fx.burst(W / 2, 140, C.yellow, 30, 200);
        }
      }
      const inX = bx + bw - 4 > p.x && bx + 4 < p.x + 64;
      const inGap = this.y + 4 > p.gap - p.size / 2 && this.y + bh - 4 < p.gap + p.size / 2;
      if (inX && !inGap) this.crash();
    }
    if (this.y + bh > GROUND) this.crash();
    if (this.y < -30) {
      this.y = -30;
      this.vy = 0;
    }
  }

  crash() {
    if (this.dead > 0) return;
    this.dead = 1;
    this.flashT = 0.15;
    this.shake.kick(9, 0.35);
    this.fx.burst(93, this.y + 12, C.yellow, 30, 240, { gravity: 500 });
    sfx.boom(0.6);
    if (this.vy < 0) this.vy = 0;
  }

  medal() {
    return this.score >= 40 ? ['PLATINUM', C.lavender] : this.score >= 30 ? ['GOLD', C.yellow] : this.score >= 20 ? ['SILVER', C.text] : this.score >= 10 ? ['BRONZE', C.peach] : null;
  }

  hud(): [string, string | number][] {
    const m = this.medal();
    return m ? [['MEDAL', m[0]]] : [];
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, C.crust);
    sky.addColorStop(1, '#232338');
    clear(ctx, W, H);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND);
    ctx.save();
    this.shake.apply(ctx);

    // stars + moon
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i);
      ctx.fillStyle = C.lavender;
      const sx = (((i * 131 - this.scroll * 0.05) % W) + W) % W;
      ctx.fillRect(sx, (i * 71) % (GROUND - 200), 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.rosewater;
    ctx.beginPath();
    ctx.arc(310, 90, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.crust;
    ctx.beginPath();
    ctx.arc(298, 82, 24, 0, Math.PI * 2);
    ctx.fill();

    // parallax city
    const span = this.city.length * 34;
    for (const b of this.city) {
      let x = (b.x - this.scroll * 0.25) % span;
      if (x < -34) x += span;
      ctx.fillStyle = '#2a2a40';
      ctx.fillRect(x, GROUND - b.h, 30, b.h);
      ctx.fillStyle = C.yellow;
      b.lit.forEach((on, i) => {
        if (on && (i % 3) * 9 + 5 < 30 && Math.floor(i / 3) * 14 + 8 < b.h) ctx.fillRect(x + (i % 3) * 9 + 5, GROUND - b.h + Math.floor(i / 3) * 14 + 8, 4, 5);
      });
    }

    // pipes as LED columns
    for (const p of this.pipes) {
      const top = p.gap - p.size / 2;
      const bot = p.gap + p.size / 2;
      for (const [y0, y1] of [[0, top], [bot, GROUND]]) {
        const g = ctx.createLinearGradient(p.x, 0, p.x + 64, 0);
        g.addColorStop(0, '#61a55a');
        g.addColorStop(0.4, C.green);
        g.addColorStop(1, '#467a42');
        ctx.fillStyle = g;
        ctx.fillRect(p.x + 4, y0, 56, y1 - y0);
        ctx.fillStyle = C.crust;
        for (let y = y0 + 6; y < y1; y += 12) ctx.fillRect(p.x + 4, y, 56, 2);
      }
      ctx.fillStyle = C.green;
      ctx.fillRect(p.x, top - 18, 64, 18);
      ctx.fillRect(p.x, bot, 64, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(p.x + 6, top - 16, 6, 14);
      ctx.fillRect(p.x + 6, bot + 2, 6, 14);
    }

    // ground
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = C.green;
    ctx.fillRect(0, GROUND, W, 4);
    ctx.fillStyle = C.line;
    for (let x = -((this.scroll) % 24); x < W; x += 24) ctx.fillRect(x, GROUND + 14, 12, 4);

    // bird, tilted by velocity
    ctx.save();
    ctx.translate(93, this.y + 12);
    ctx.rotate(clamp(this.vy / 700, -0.45, 1.2));
    const frame = this.flapT > 0 || (!this.started && Math.floor(t * 6) % 2) ? 1 : 0;
    ctx.shadowColor = C.yellow;
    ctx.shadowBlur = 10;
    sprite(ctx, BIRD[frame], -15, -12, PX, this.dead > 0 ? C.red : C.yellow);
    ctx.shadowBlur = 0;
    ctx.fillStyle = C.crust;
    ctx.fillRect(-15 + 6 * PX, -12 + 2 * PX, PX, PX);
    ctx.fillStyle = C.peach;
    ctx.fillRect(-15 + 8 * PX, -12 + 4 * PX, 2 * PX, PX);
    ctx.restore();

    this.fx.draw(ctx);

    text(ctx, String(this.score), W / 2, 60, { size: 48, color: C.bright, weight: 700, glow: 12 });
    if (!this.started) {
      text(ctx, 'TAP / SPACE TO FLAP', W / 2, H / 2 + 50, { size: 14, color: C.text, glow: 4 + Math.sin(t * 5) * 3 });
    }
    this.floaters.draw(ctx, 24);
    ctx.restore();

    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashT * 3})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

export const flappy: GameDef = {
  ...info('flappy'),
  controls: 'SPACE / ↑ / CLICK',
  color: C.yellow,
  width: W,
  height: H,
  icon: ['........', '..###...', '.#..##..', '####.#..', '#...###.', '####..#.', '.#####..', '........'],
  touch: { pointer: 'TAP TO FLAP' },
  storageKey: 'arcade-flappy-high',
  create: () => new Flappy(),
};
