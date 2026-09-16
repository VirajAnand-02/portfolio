import { info } from '../catalog';
import { C, clear, Floaters, GameDef, GameInstance, Input, Particles, rand, randInt, sfx, Shake, TAU, text } from '../core';

const W = 640;
const H = 480;

type Rock = { x: number; y: number; vx: number; vy: number; r: number; size: 3 | 2 | 1; rot: number; spin: number; shape: number[] };
type Bullet = { x: number; y: number; vx: number; vy: number; life: number; enemy?: boolean };
type Saucer = { x: number; y: number; vx: number; vy: number; turn: number; fire: number; small: boolean };

const wrap = (v: number, max: number) => ((v % max) + max) % max;

function wrapDist(ax: number, ay: number, bx: number, by: number) {
  let dx = Math.abs(ax - bx);
  let dy = Math.abs(ay - by);
  if (dx > W / 2) dx = W - dx;
  if (dy > H / 2) dy = H - dy;
  return Math.hypot(dx, dy);
}

class Asteroids implements GameInstance {
  ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 };
  rocks: Rock[] = [];
  bullets: Bullet[] = [];
  saucer: Saucer | null = null;
  saucerT = 18;
  lives = 3;
  wave = 0;
  score = 0;
  nextLife = 10000;
  over = false;
  dead = 0;
  invuln = 2;
  thrusting = false;
  hyper = 0;
  fireCd = 0;
  beat = 0;
  beatI = 0;
  debris: { x: number; y: number; vx: number; vy: number; a: number; spin: number; len: number; life: number }[] = [];
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();

  constructor() {
    this.spawnWave();
  }

  rock(x: number, y: number, size: 3 | 2 | 1, speedMul = 1): Rock {
    const r = size === 3 ? 42 : size === 2 ? 22 : 12;
    const a = Math.random() * TAU;
    const s = rand(30, 70) * (4 - size) * 0.55 * speedMul;
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r, size, rot: 0, spin: rand(-1, 1), shape: Array.from({ length: 11 }, () => rand(0.72, 1.12)) };
  }

  spawnWave() {
    const n = Math.min(11, 4 + this.wave);
    for (let i = 0; i < n; i++) {
      // spawn along the edges, away from the ship
      const edge = Math.random() < 0.5;
      const x = edge ? rand(0, W) : Math.random() < 0.5 ? 0 : W;
      const y = edge ? (Math.random() < 0.5 ? 0 : H) : rand(0, H);
      this.rocks.push(this.rock(x, y, 3, 1 + this.wave * 0.08));
    }
  }

  hud(): [string, string | number][] {
    return [['WAVE', this.wave + 1], ['SHIPS', this.lives]];
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    this.shake.update(dt);
    const s = this.ship;

    if (this.dead > 0) {
      this.dead -= dt;
      if (this.dead <= 0) {
        if (this.lives <= 0) {
          this.over = true;
          return;
        }
        // wait for a clear spawn
        if (this.rocks.some((r) => wrapDist(r.x, r.y, W / 2, H / 2) < r.r + 70)) this.dead = 0.1;
        else {
          Object.assign(s, { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 });
          this.invuln = 2.5;
        }
      }
    } else if (this.hyper > 0) {
      this.hyper -= dt;
    } else {
      if (input.isDown('left')) s.a -= 4.6 * dt;
      if (input.isDown('right')) s.a += 4.6 * dt;
      this.thrusting = input.isDown('up');
      if (this.thrusting) {
        s.vx += Math.cos(s.a) * 300 * dt;
        s.vy += Math.sin(s.a) * 300 * dt;
        if (Math.random() < 0.6) {
          const bx = s.x - Math.cos(s.a) * 12;
          const by = s.y - Math.sin(s.a) * 12;
          this.fx.items.push({ x: bx, y: by, vx: -Math.cos(s.a + rand(-0.3, 0.3)) * 160 + s.vx, vy: -Math.sin(s.a + rand(-0.3, 0.3)) * 160 + s.vy, life: 0.25, max: 0.25, color: Math.random() < 0.5 ? C.peach : C.yellow, size: 3, gravity: 0 });
        }
      }
      const drag = Math.pow(0.55, dt);
      s.vx *= drag;
      s.vy *= drag;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > 420) {
        s.vx *= 420 / sp;
        s.vy *= 420 / sp;
      }
      s.x = wrap(s.x + s.vx * dt, W);
      s.y = wrap(s.y + s.vy * dt, H);

      this.fireCd -= dt;
      if (input.repeat('a', 0.22, 0.2) && this.fireCd <= 0 && this.bullets.filter((b) => !b.enemy).length < 6) {
        this.fireCd = 0.12;
        this.bullets.push({ x: s.x + Math.cos(s.a) * 14, y: s.y + Math.sin(s.a) * 14, vx: Math.cos(s.a) * 560 + s.vx, vy: Math.sin(s.a) * 560 + s.vy, life: 0.9 });
        sfx.shoot();
      }
      if (input.pressed('b')) {
        // hyperspace: vanish, reappear somewhere random
        this.fx.burst(s.x, s.y, C.lavender, 20, 200);
        Object.assign(s, { x: rand(40, W - 40), y: rand(40, H - 40), vx: 0, vy: 0 });
        this.hyper = 0.5;
        sfx.jump();
      }
    }
    this.invuln = Math.max(0, this.invuln - dt);

    for (const r of this.rocks) {
      r.x = wrap(r.x + r.vx * dt, W);
      r.y = wrap(r.y + r.vy * dt, H);
      r.rot += r.spin * dt;
    }
    for (const b of this.bullets) {
      b.x = wrap(b.x + b.vx * dt, W);
      b.y = wrap(b.y + b.vy * dt, H);
      b.life -= dt;
    }
    for (const d of this.debris) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.a += d.spin * dt;
      d.life -= dt;
    }
    this.debris = this.debris.filter((d) => d.life > 0);

    // bullets vs rocks
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      const hit = this.rocks.find((r) => wrapDist(b.x, b.y, r.x, r.y) < r.r);
      if (hit) {
        b.life = 0;
        this.split(hit, !b.enemy);
      }
    }

    this.updateSaucer(dt);

    // ship collisions
    if (this.dead <= 0 && this.hyper <= 0 && this.invuln <= 0) {
      const rockHit = this.rocks.find((r) => wrapDist(s.x, s.y, r.x, r.y) < r.r + 9);
      const bulletHit = this.bullets.find((b) => b.enemy && b.life > 0 && wrapDist(s.x, s.y, b.x, b.y) < 11);
      const saucerHit = this.saucer && wrapDist(s.x, s.y, this.saucer.x, this.saucer.y) < 22;
      if (rockHit || bulletHit || saucerHit) {
        if (rockHit) this.split(rockHit, true);
        if (bulletHit) bulletHit.life = 0;
        this.killShip();
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    if (!this.rocks.length && !this.saucer) {
      this.wave++;
      this.spawnWave();
      this.floaters.add(W / 2, H / 2 - 30, `WAVE ${this.wave + 1}`, C.yellow);
    }

    if (this.score >= this.nextLife) {
      this.nextLife += 10000;
      this.lives++;
      this.floaters.add(s.x, s.y - 20, '1UP', C.green);
      sfx.power();
    }

    // heartbeat speeds up as the field thins out
    this.beat -= dt;
    if (this.beat <= 0 && this.dead <= 0) {
      this.beat = Math.max(0.25, 0.3 + this.rocks.length * 0.06);
      sfx.hit(this.beatI++ % 2 ? 55 : 62);
    }
  }

  updateSaucer(dt: number) {
    this.saucerT -= dt;
    if (!this.saucer && this.saucerT <= 0) {
      const small = this.score > 8000 || Math.random() < 0.3;
      const fromLeft = Math.random() < 0.5;
      this.saucer = { x: fromLeft ? 0 : W, y: rand(60, H - 60), vx: (fromLeft ? 1 : -1) * (small ? 130 : 90), vy: 0, turn: 1, fire: 1, small };
      this.saucerT = rand(15, 25);
    }
    const u = this.saucer;
    if (!u) return;
    u.x += u.vx * dt;
    u.y = wrap(u.y + u.vy * dt, H);
    u.turn -= dt;
    if (u.turn <= 0) {
      u.turn = rand(0.8, 1.6);
      u.vy = [-70, 0, 70][randInt(0, 2)];
    }
    u.fire -= dt;
    if (u.fire <= 0 && this.dead <= 0) {
      u.fire = u.small ? 0.9 : 1.3;
      const aimed = u.small ? Math.atan2(this.ship.y - u.y, this.ship.x - u.x) + rand(-0.2, 0.2) : rand(0, TAU);
      this.bullets.push({ x: u.x, y: u.y, vx: Math.cos(aimed) * 300, vy: Math.sin(aimed) * 300, life: 1.2, enemy: true });
      sfx.blip(300);
    }
    if (u.x < -30 || u.x > W + 30) {
      this.saucer = null;
      return;
    }
    const hit = this.bullets.find((b) => !b.enemy && b.life > 0 && wrapDist(b.x, b.y, u.x, u.y) < (u.small ? 12 : 20));
    if (hit) {
      hit.life = 0;
      const pts = u.small ? 1000 : 200;
      this.score += pts;
      this.floaters.add(u.x, u.y - 16, String(pts), C.mauve);
      this.fx.burst(u.x, u.y, C.mauve, 40, 260);
      this.shake.kick(6, 0.3);
      sfx.boom(0.8);
      this.saucer = null;
    }
  }

  split(r: Rock, scored: boolean) {
    this.rocks = this.rocks.filter((x) => x !== r);
    if (scored) this.score += r.size === 3 ? 20 : r.size === 2 ? 50 : 100;
    this.fx.burst(r.x, r.y, C.text, r.size * 8, 60 + r.size * 40);
    this.shake.kick(r.size * 1.5, 0.15);
    sfx.boom(r.size / 3);
    if (r.size > 1) {
      const size = (r.size - 1) as 2 | 1;
      for (let i = 0; i < 2; i++) this.rocks.push(this.rock(r.x, r.y, size, 1 + this.wave * 0.1));
    }
  }

  killShip() {
    const s = this.ship;
    this.lives--;
    this.dead = 2;
    this.shake.kick(12, 0.5);
    sfx.boom(1.2);
    this.fx.burst(s.x, s.y, C.peach, 30, 220);
    for (let i = 0; i < 5; i++) this.debris.push({ x: s.x, y: s.y, vx: rand(-60, 60) + s.vx * 0.3, vy: rand(-60, 60) + s.vy * 0.3, a: rand(0, TAU), spin: rand(-4, 4), len: rand(8, 16), life: rand(1, 1.8) });
    s.vx = s.vy = 0;
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H, C.crust);
    ctx.save();
    this.shake.apply(ctx);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = i % 7 ? C.grid : C.line;
      ctx.fillRect((i * 173) % W, (i * 97) % H, 2, 2);
    }

    // rocks, drawn at wrapped offsets so they slide across edges
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.lavender;
    ctx.shadowBlur = 8;
    for (const r of this.rocks) {
      for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
        const x = r.x + ox;
        const y = r.y + oy;
        if (x < -r.r || x > W + r.r || y < -r.r || y > H + r.r) continue;
        ctx.beginPath();
        r.shape.forEach((m, i) => {
          const a = r.rot + (i / r.shape.length) * TAU;
          ctx.lineTo(x + Math.cos(a) * r.r * m, y + Math.sin(a) * r.r * m);
        });
        ctx.closePath();
        ctx.stroke();
      }
    }

    // ship
    const s = this.ship;
    const blink = this.invuln > 0 && Math.floor(t * 10) % 2 === 0;
    if (this.dead <= 0 && this.hyper <= 0 && !blink) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.strokeStyle = C.green;
      ctx.shadowColor = C.green;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.stroke();
      if (this.thrusting && Math.floor(t * 30) % 2) {
        ctx.strokeStyle = C.peach;
        ctx.shadowColor = C.peach;
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(-16 - Math.random() * 5, 0);
        ctx.lineTo(-7, 4);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.strokeStyle = C.green;
    for (const d of this.debris) {
      ctx.globalAlpha = Math.min(1, d.life);
      ctx.beginPath();
      ctx.moveTo(d.x - (Math.cos(d.a) * d.len) / 2, d.y - (Math.sin(d.a) * d.len) / 2);
      ctx.lineTo(d.x + (Math.cos(d.a) * d.len) / 2, d.y + (Math.sin(d.a) * d.len) / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const u = this.saucer;
    if (u) {
      const k = u.small ? 0.6 : 1;
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.scale(k, k);
      ctx.strokeStyle = C.mauve;
      ctx.shadowColor = C.mauve;
      ctx.beginPath();
      ctx.moveTo(-22, 2);
      ctx.lineTo(22, 2);
      ctx.lineTo(12, 10);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.moveTo(-22, 2);
      ctx.lineTo(-10, -6);
      ctx.lineTo(10, -6);
      ctx.lineTo(22, 2);
      ctx.moveTo(-6, -6);
      ctx.lineTo(-4, -13);
      ctx.lineTo(4, -13);
      ctx.lineTo(6, -6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 10;
    for (const b of this.bullets) {
      ctx.fillStyle = b.enemy ? C.mauve : C.bright;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (this.dead > 0 && this.lives > 0 && this.dead < 1.5) text(ctx, 'GET READY', W / 2, H / 2 + 50, { size: 16, color: C.muted });

    this.fx.draw(ctx);
    this.floaters.draw(ctx, 16);
    ctx.restore();
  }
}

export const asteroids: GameDef = {
  ...info('asteroids'),
  controls: '←/→ ROTATE · ↑ THRUST · SPACE FIRE · X HYPER',
  color: C.lavender,
  width: W,
  height: H,
  icon: ['..###...', '.#...#..', '#.....#.', '#......#', '.#....#.', '..####..', '......#.', '.....#.#'],
  touch: { dpad: 'full', a: 'FIRE', b: 'HYPER' },
  storageKey: 'arcade-asteroids-high',
  create: () => new Asteroids(),
};
