import { info } from '../catalog';
import { C, clamp, clear, Floaters, GameDef, GameInstance, Input, Particles, pick, rand, sfx, Shake, sprite, text } from '../core';

const W = 480;
const H = 560;
const PX = 3;

const ALIENS = [
  // squid, crab, octopus — two frames each (8/11/12 wide)
  [['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'], ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.']],
  [['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'], ['..#.....#..', '#..#...#..#', '#.#######.#', '###.###.###', '###########', '.#########.', '..#.....#..', '.#.......#.']],
  [['....####....', '.##########.', '############', '###..##..###', '############', '...##..##...', '..##.##.##..', '##........##'], ['....####....', '.##########.', '############', '###..##..###', '############', '..###..###..', '.##..##..##.', '..##....##..']],
];
const ROW_KIND = [0, 1, 1, 2, 2];
const ROW_POINTS = [30, 20, 20, 10, 10];
const ROW_COLOR = [C.mauve, C.sky, C.sky, C.green, C.green];

const SHIP = ['.....#.....', '....###....', '....###....', '.#########.', '###########', '###########', '###########'];
const UFO = ['.....######.....', '...##########...', '..############..', '.##.##.##.##.##.', '################', '..###..##..###..', '...#........#...'];
const BUNKER = ['....##########....', '...############...', '..##############..', '.################.', '##################', '##################', '##################', '##################', '#####........#####', '####..........####', '####..........####'];

type Alien = { col: number; row: number; alive: boolean };
type Shot = { x: number; y: number; vy: number };

class Invaders implements GameInstance {
  aliens: Alien[] = [];
  ox = 40;
  oy = 90;
  dir = 1;
  stepT = 0;
  frame = 0;
  px = W / 2;
  shot: Shot | null = null;
  bombs: Shot[] = [];
  bunkers: boolean[][][] = [];
  ufo: { x: number; dir: number } | null = null;
  ufoT = rand(15, 25);
  lives = 3;
  wave = 0;
  score = 0;
  over = false;
  respawn = 0;
  waveBanner = 0;
  bombT = 1;
  noteI = 0;
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();

  constructor() {
    this.newWave();
    this.bunkers = Array.from({ length: 4 }, () => BUNKER.map((r) => [...r].map((c) => c === '#')));
  }

  newWave() {
    this.aliens = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 11; col++) this.aliens.push({ col, row, alive: true });
    this.ox = 40;
    this.oy = 90 + Math.min(this.wave, 6) * 14;
    this.dir = 1;
    this.bombs = [];
    this.shot = null;
    this.waveBanner = 1.5;
  }

  alienPos(a: Alien) {
    return { x: this.ox + a.col * 36, y: this.oy + a.row * 34 };
  }

  hud(): [string, string | number][] {
    return [['WAVE', this.wave + 1], ['LIVES', this.lives]];
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    this.shake.update(dt);
    this.waveBanner = Math.max(0, this.waveBanner - dt);
    const alive = this.aliens.filter((a) => a.alive);

    if (this.respawn > 0) {
      this.respawn -= dt;
      if (this.respawn <= 0) {
        if (this.lives <= 0) this.over = true;
        else this.px = W / 2;
      }
    } else {
      if (input.isDown('left')) this.px -= 240 * dt;
      if (input.isDown('right')) this.px += 240 * dt;
      this.px = clamp(this.px, 24, W - 24);
      if ((input.pressed('a') || input.pressed('up')) && !this.shot) {
        this.shot = { x: this.px, y: H - 60, vy: -620 };
        sfx.shoot();
      }
    }

    // march: fewer aliens → faster steps
    const interval = Math.max(0.035, 0.02 + (alive.length / 55) * 0.55 - this.wave * 0.02);
    this.stepT -= dt;
    if (this.stepT <= 0 && alive.length) {
      this.stepT = interval;
      this.frame ^= 1;
      const xs = alive.map((a) => this.alienPos(a).x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + 36;
      if ((this.dir > 0 && maxX + 8 > W - 10) || (this.dir < 0 && minX - 8 < 10)) {
        this.dir *= -1;
        this.oy += 16;
      } else this.ox += 8 * this.dir;
      sfx.hit([98, 92, 87, 82][this.noteI++ % 4]);
      // aliens reaching the ground end the game
      const lowest = Math.max(...alive.map((a) => this.alienPos(a).y)) + 26;
      if (lowest >= H - 70 && this.respawn <= 0) {
        this.lives = 0;
        this.killPlayer();
      }
      // chew through bunkers they overlap
      if (lowest >= this.bunkerOrigin(0).y) {
        for (const a of alive) {
          const p = this.alienPos(a);
          if (p.y + 26 >= this.bunkerOrigin(0).y) this.carve(p.x + 18, p.y + 12, 18);
        }
      }
    }

    // bombs from the lowest alien in a random column
    this.bombT -= dt;
    if (this.bombT <= 0 && alive.length && this.respawn <= 0) {
      this.bombT = Math.max(0.25, rand(0.5, 1.3) - this.wave * 0.08);
      const cols = [...new Set(alive.map((a) => a.col))];
      // bias towards the player's column
      const aimCol = Math.round((this.px - this.ox - 14) / 36);
      const col = Math.random() < 0.4 && cols.includes(aimCol) ? aimCol : pick(cols);
      const low = alive.filter((a) => a.col === col).sort((a, b) => b.row - a.row)[0];
      const p = this.alienPos(low);
      this.bombs.push({ x: p.x + 16, y: p.y + 26, vy: 180 + this.wave * 20 });
    }

    if (this.shot) {
      this.shot.y += this.shot.vy * dt;
      if (this.shot.y < 30) {
        this.fx.burst(this.shot.x, 34, C.red, 6, 80);
        this.shot = null;
      }
    }
    for (const b of this.bombs) b.y += b.vy * dt;

    // shot vs aliens
    if (this.shot) {
      for (const a of alive) {
        const p = this.alienPos(a);
        const w = [8, 11, 12][ROW_KIND[a.row]] * PX;
        const ax = p.x + (36 - w) / 2;
        if (this.shot.x >= ax && this.shot.x <= ax + w && this.shot.y >= p.y && this.shot.y <= p.y + 24) {
          a.alive = false;
          this.score += ROW_POINTS[a.row];
          this.fx.burst(ax + w / 2, p.y + 12, ROW_COLOR[a.row], 16, 180);
          sfx.boom(0.3);
          this.shot = null;
          break;
        }
      }
    }
    // shot vs ufo
    if (this.shot && this.ufo && this.shot.y < 70 && this.shot.y > 40 && Math.abs(this.shot.x - (this.ufo.x + 24)) < 26) {
      const pts = pick([50, 100, 150, 300]);
      this.score += pts;
      this.floaters.add(this.ufo.x + 24, 56, String(pts), C.red);
      this.fx.burst(this.ufo.x + 24, 56, C.red, 30, 220);
      this.shake.kick(4, 0.2);
      sfx.coin();
      this.ufo = null;
      this.shot = null;
    }
    // shot vs bombs
    if (this.shot) {
      const hit = this.bombs.findIndex((b) => Math.abs(b.x - this.shot!.x) < 6 && Math.abs(b.y - this.shot!.y) < 12);
      if (hit >= 0) {
        this.fx.burst(this.bombs[hit].x, this.bombs[hit].y, C.yellow, 8, 100);
        this.bombs.splice(hit, 1);
        this.shot = null;
      }
    }
    // projectiles vs bunkers
    if (this.shot && this.carveHit(this.shot.x, this.shot.y)) this.shot = null;
    this.bombs = this.bombs.filter((b) => !this.carveHit(b.x, b.y + 8));

    // bombs vs player
    if (this.respawn <= 0) {
      for (const b of this.bombs) {
        if (b.y > H - 58 && b.y < H - 30 && Math.abs(b.x - this.px) < 16) {
          this.lives--;
          this.killPlayer();
          break;
        }
      }
    }
    this.bombs = this.bombs.filter((b) => b.y < H - 24);

    // ufo
    this.ufoT -= dt;
    if (this.ufoT <= 0 && !this.ufo) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.ufo = { x: dir > 0 ? -48 : W, dir };
      this.ufoT = rand(18, 30);
    }
    if (this.ufo) {
      this.ufo.x += this.ufo.dir * 110 * dt;
      if (this.ufo.x < -60 || this.ufo.x > W + 10) this.ufo = null;
    }

    if (!alive.length && !this.aliens.some((a) => a.alive) && this.respawn <= 0) {
      this.wave++;
      this.score += 500;
      sfx.win();
      this.newWave();
    }
  }

  killPlayer() {
    this.fx.burst(this.px, H - 44, C.green, 40, 260);
    this.shake.kick(10, 0.4);
    sfx.boom(1);
    this.bombs = [];
    this.respawn = 1.4;
  }

  bunkerOrigin(i: number) {
    return { x: 48 + i * 112, y: H - 130 };
  }

  /** knocks a hole in a bunker if (x,y) is on a solid pixel */
  carveHit(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const o = this.bunkerOrigin(i);
      const c = Math.floor((x - o.x) / PX);
      const r = Math.floor((y - o.y) / PX);
      const b = this.bunkers[i];
      if (r >= 0 && r < b.length && c >= 0 && c < b[0].length && b[r][c]) {
        this.carve(x, y, 7);
        this.fx.burst(x, y, C.green, 4, 60);
        return true;
      }
    }
    return false;
  }

  carve(x: number, y: number, radius: number) {
    for (let i = 0; i < 4; i++) {
      const o = this.bunkerOrigin(i);
      const b = this.bunkers[i];
      for (let r = 0; r < b.length; r++)
        for (let c = 0; c < b[0].length; c++) {
          const cx = o.x + c * PX + 1;
          const cy = o.y + r * PX + 1;
          const d = Math.hypot(cx - x, cy - y);
          if (d < radius && Math.random() < 1.2 - d / radius) b[r][c] = false;
        }
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H, C.crust);
    ctx.save();
    this.shake.apply(ctx);

    // stars
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % W;
      const y = (i * 53 + t * (4 + (i % 3) * 3)) % H;
      ctx.fillStyle = i % 5 ? C.grid : C.line;
      ctx.fillRect(x, y, 2, 2);
    }

    for (const a of this.aliens) {
      if (!a.alive) continue;
      const p = this.alienPos(a);
      const art = ALIENS[ROW_KIND[a.row]][this.frame];
      const w = art[0].length * PX;
      sprite(ctx, art, p.x + (36 - w) / 2, p.y, PX, ROW_COLOR[a.row]);
    }

    if (this.ufo) sprite(ctx, UFO, this.ufo.x, 44, PX, C.red);

    this.bunkers.forEach((b, i) => {
      const o = this.bunkerOrigin(i);
      ctx.fillStyle = C.green;
      b.forEach((row, r) => row.forEach((v, c) => v && ctx.fillRect(o.x + c * PX, o.y + r * PX, PX, PX)));
    });

    if (this.respawn <= 0) sprite(ctx, SHIP, this.px - 16, H - 58, PX, C.green);
    else if (this.lives > 0 && Math.floor(this.respawn * 8) % 2) sprite(ctx, SHIP, W / 2 - 16, H - 58, PX, C.dim);

    ctx.fillStyle = C.bright;
    if (this.shot) ctx.fillRect(this.shot.x - 1, this.shot.y - 8, 2, 10);
    for (const b of this.bombs) {
      ctx.fillStyle = C.yellow;
      const zig = Math.floor(b.y / 6) % 2 ? 2 : -2;
      ctx.fillRect(b.x - 1 + zig, b.y, 3, 4);
      ctx.fillRect(b.x - 1 - zig, b.y + 4, 3, 4);
    }

    ctx.fillStyle = C.green;
    ctx.fillRect(0, H - 26, W, 2);
    for (let i = 0; i < this.lives - 1; i++) sprite(ctx, SHIP, 12 + i * 40, H - 20, 2, C.green);

    if (this.waveBanner > 0) {
      ctx.globalAlpha = Math.min(1, this.waveBanner * 2);
      text(ctx, `WAVE ${this.wave + 1}`, W / 2, H / 2, { size: 32, color: C.yellow, weight: 700, glow: 16 });
      ctx.globalAlpha = 1;
    }

    this.fx.draw(ctx);
    this.floaters.draw(ctx);
    ctx.restore();
  }
}

export const invaders: GameDef = {
  ...info('invaders'),
  controls: '←/→ MOVE · SPACE FIRE',
  color: C.red,
  width: W,
  height: H,
  icon: ['..#..#..', '...##...', '..####..', '.#.##.#.', '########', '#.#..#.#', '........', '...##...'],
  touch: { dpad: 'horizontal', a: 'FIRE' },
  storageKey: 'arcade-invaders-high',
  create: () => new Invaders(),
};
