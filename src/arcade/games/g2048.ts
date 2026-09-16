import { info } from '../catalog';
import { C, clear, Floaters, GameDef, GameInstance, Input, Particles, PointerEvt, sfx, text } from '../core';

const N = 4;
const PAD = 14;
const CELL = 96;
const SIZE = PAD + N * (CELL + PAD);
const W = SIZE;
const H = SIZE;
const SLIDE = 0.1;

type Tile = { id: number; v: number; r: number; c: number; fromR: number; fromC: number; born: number; merged: number; dead?: boolean };

const TILE_COLORS: Record<number, [string, string]> = {
  2: ['#34364b', C.text],
  4: ['#3d3f58', C.text],
  8: [C.peach, C.crust],
  16: ['#ff9460', C.crust],
  32: [C.red, C.crust],
  64: ['#eb5f84', C.crust],
  128: [C.yellow, C.crust],
  256: ['#f5d27a', C.crust],
  512: [C.green, C.crust],
  1024: [C.teal, C.crust],
  2048: [C.mauve, C.crust],
};
const tileColor = (v: number) => TILE_COLORS[v] ?? [C.pink, C.crust];

class Game2048 implements GameInstance {
  tiles: Tile[] = [];
  nextId = 1;
  score = 0;
  over = false;
  won = false;
  reached = false;
  anim = 0;
  best = 0;
  swipe: { x: number; y: number } | null = null;
  endT = 0;
  fx = new Particles();
  floaters = new Floaters();

  constructor() {
    this.add();
    this.add();
    for (const t of this.tiles) t.born = 0;
  }

  grid() {
    const g: (Tile | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
    for (const t of this.tiles) if (!t.dead) g[t.r][t.c] = t;
    return g;
  }

  add() {
    const g = this.grid();
    const empty: [number, number][] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.tiles.push({ id: this.nextId++, v: Math.random() < 0.9 ? 2 : 4, r, c, fromR: r, fromC: c, born: 0.18, merged: 0 });
  }

  move(dr: number, dc: number) {
    this.tiles = this.tiles.filter((t) => !t.dead);
    for (const t of this.tiles) {
      t.fromR = t.r;
      t.fromC = t.c;
    }
    const g = this.grid();
    let moved = false;
    let gained = 0;
    const order = [...Array(N).keys()];
    const rows = dr > 0 ? [...order].reverse() : order;
    const cols = dc > 0 ? [...order].reverse() : order;
    const mergedInto = new Set<Tile>();

    for (const r of rows)
      for (const c of cols) {
        const t = g[r][c];
        if (!t) continue;
        let nr = r;
        let nc = c;
        while (true) {
          const tr = nr + dr;
          const tc = nc + dc;
          if (tr < 0 || tr >= N || tc < 0 || tc >= N) break;
          const other = g[tr][tc];
          if (!other) {
            nr = tr;
            nc = tc;
            continue;
          }
          if (other.v === t.v && !mergedInto.has(other)) {
            // slide onto the other tile, then vanish; the other doubles
            g[r][c] = null;
            t.r = tr;
            t.c = tc;
            t.dead = true;
            other.v *= 2;
            other.merged = 0.2;
            mergedInto.add(other);
            gained += other.v;
            moved = true;
            if (other.v === 2048 && !this.reached) {
              this.reached = true;
              this.floaters.add(W / 2, H / 2, 'YOU MADE 2048!', C.mauve);
              sfx.win();
            }
            nr = -1;
          }
          break;
        }
        if (nr === -1) continue;
        if (nr !== r || nc !== c) {
          g[r][c] = null;
          g[nr][nc] = t;
          t.r = nr;
          t.c = nc;
          moved = true;
        }
      }

    if (!moved) {
      sfx.tick();
      return;
    }
    this.anim = SLIDE;
    this.score += gained;
    if (gained) {
      sfx.blip(300 + Math.log2(gained) * 60);
      for (const t of mergedInto) {
        const [cx, cy] = this.center(t.r, t.c);
        this.fx.burst(cx, cy, tileColor(t.v)[0], 10, 150);
      }
    } else sfx.tick();
    this.pendingSpawn = true;
  }

  pendingSpawn = false;

  canMove() {
    const g = this.grid();
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const t = g[r][c];
        if (!t) return true;
        if (c + 1 < N && g[r][c + 1]?.v === t.v) return true;
        if (r + 1 < N && g[r + 1][c]?.v === t.v) return true;
      }
    return false;
  }

  pointer(e: PointerEvt) {
    if (e.kind === 'down') this.swipe = { x: e.x, y: e.y };
    if (e.kind === 'up' && this.swipe) {
      const dx = e.x - this.swipe.x;
      const dy = e.y - this.swipe.y;
      this.swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      this.queued = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0];
    }
  }

  queued: [number, number] | null = null;

  center(r: number, c: number) {
    return [PAD + c * (CELL + PAD) + CELL / 2, PAD + r * (CELL + PAD) + CELL / 2];
  }

  hud(): [string, string | number][] {
    const top = Math.max(...this.tiles.filter((t) => !t.dead).map((t) => t.v));
    return [['TILE', top]];
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.floaters.update(dt);
    for (const t of this.tiles) {
      t.born = Math.max(0, t.born - dt);
      t.merged = Math.max(0, t.merged - dt);
    }
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) this.over = true;
      return;
    }
    if (this.anim > 0) {
      this.anim -= dt;
      if (this.anim <= 0) {
        this.anim = 0;
        this.tiles = this.tiles.filter((t) => !t.dead);
        for (const t of this.tiles) {
          t.fromR = t.r;
          t.fromC = t.c;
        }
        if (this.pendingSpawn) {
          this.pendingSpawn = false;
          this.add();
          if (!this.canMove()) {
            this.endT = 1;
            sfx.lose();
          }
        }
      }
      // allow buffering the next move during the slide
    }
    let dir: [number, number] | null = this.queued;
    if (input.pressed('up')) dir = [-1, 0];
    if (input.pressed('down')) dir = [1, 0];
    if (input.pressed('left')) dir = [0, -1];
    if (input.pressed('right')) dir = [0, 1];
    if (dir) {
      if (this.anim > 0) this.queued = dir;
      else {
        this.queued = null;
        this.move(dir[0], dir[1]);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H, C.crust);
    ctx.fillStyle = C.panel;
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, 12);
    ctx.fill();
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        ctx.fillStyle = C.grid;
        ctx.beginPath();
        ctx.roundRect(PAD + c * (CELL + PAD), PAD + r * (CELL + PAD), CELL, CELL, 8);
        ctx.fill();
      }

    const k = this.anim > 0 ? 1 - this.anim / SLIDE : 1;
    const ease = 1 - (1 - k) * (1 - k);
    // dead tiles first so merges render on top
    const sorted = [...this.tiles].sort((a, b) => Number(!!b.dead) - Number(!!a.dead));
    for (const tile of sorted) {
      if (tile.dead && this.anim <= 0) continue;
      const r = tile.fromR + (tile.r - tile.fromR) * ease;
      const c = tile.fromC + (tile.c - tile.fromC) * ease;
      let scale = 1;
      if (tile.born > 0) scale = this.anim > 0 ? 0 : 1 - tile.born / 0.18;
      if (tile.merged > 0 && this.anim <= 0) scale = 1 + Math.sin((tile.merged / 0.2) * Math.PI) * 0.12;
      if (scale <= 0) continue;
      const x = PAD + c * (CELL + PAD) + CELL / 2;
      const y = PAD + r * (CELL + PAD) + CELL / 2;
      // merged tile shows its old value until the slide finishes
      const shown = tile.merged > 0 && this.anim > 0 ? tile.v / 2 : tile.v;
      const [bg, fg] = tileColor(shown);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      if (shown >= 128) {
        ctx.shadowColor = bg;
        ctx.shadowBlur = 8 + Math.log2(shown) * 1.5 + Math.sin(t * 3) * 3;
      }
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 8);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      const size = shown < 100 ? 40 : shown < 1000 ? 34 : shown < 10000 ? 27 : 21;
      text(ctx, String(shown), 0, 2, { size, color: fg, weight: 700 });
      ctx.restore();
    }

    this.fx.draw(ctx);
    this.floaters.draw(ctx, 26);
    if (this.endT > 0) {
      ctx.fillStyle = `rgba(13,13,21,${0.6 * (1 - this.endT)})`;
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'NO MOVES', W / 2, H / 2, { size: 40, color: C.red, weight: 700, glow: 14 });
    }
  }
}

export const g2048: GameDef = {
  ...info('2048'),
  controls: 'ARROWS / WASD · SWIPE',
  color: C.yellow,
  width: W,
  height: H,
  icon: ['###.###.', '..#.#.#.', '###.#.#.', '#...#.#.', '###.###.', '........', '.#.#.###', '.###.###'],
  touch: { pointer: 'SWIPE TO SLIDE' },
  storageKey: 'arcade-2048-high',
  create: () => new Game2048(),
};
