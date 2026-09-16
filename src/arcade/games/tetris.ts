import { info } from '../catalog';
import { C, clear, Floaters, GameDef, GameInstance, Input, Particles, sfx, Shake, shuffle, text } from '../core';

const COLS = 10;
const ROWS = 20;
const CELL = 24;
const BX = 16;
const BY = 16;
const W = BX * 2 + COLS * CELL + 132;
const H = BY * 2 + ROWS * CELL;
const SIDE = BX + COLS * CELL + 16;

type Kind = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

// spawn orientation, rows top→bottom
const SHAPES: Record<Kind, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
};

const COLORS: Record<Kind, string> = { I: C.sky, J: C.blue, L: C.peach, O: C.yellow, S: C.green, T: C.mauve, Z: C.red };

// SRS wall kicks, (x right, y up) as in the guideline tables
const KICKS: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

const rotateCW = (m: number[][]) => m[0].map((_, i) => m.map((row) => row[i]).reverse());

type Piece = { kind: Kind; m: number[][]; x: number; y: number; rot: number };

const GRAVITY = [0.8, 0.717, 0.633, 0.55, 0.467, 0.383, 0.3, 0.217, 0.133, 0.1, 0.083, 0.083, 0.083, 0.067, 0.067, 0.067, 0.05, 0.05, 0.05, 0.033];

class Tetris implements GameInstance {
  board: (Kind | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  bag: Kind[] = [];
  next: Kind[] = [];
  piece!: Piece;
  hold: Kind | null = null;
  canHold = true;
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  lastRotate = false;
  back2back = false;
  over = false;
  fall = 0;
  lock = 0;
  lockMoves = 0;
  clearing: number[] = [];
  clearT = 0;
  dying = 0;
  fx = new Particles();
  floaters = new Floaters();
  shake = new Shake();

  constructor() {
    for (let i = 0; i < 4; i++) this.next.push(this.draw7());
    this.spawn();
  }

  draw7(): Kind {
    if (!this.bag.length) this.bag = shuffle(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    return this.bag.pop()!;
  }

  spawn(kind?: Kind) {
    const k = kind ?? this.next.shift()!;
    if (!kind) this.next.push(this.draw7());
    const m = SHAPES[k].map((r) => [...r]);
    this.piece = { kind: k, m, x: Math.floor((COLS - m[0].length) / 2), y: k === 'I' ? -1 : 0, rot: 0 };
    this.fall = 0;
    this.lock = 0;
    this.lockMoves = 0;
    if (this.collides(this.piece.m, this.piece.x, this.piece.y)) {
      this.dying = 1.2;
      this.shake.kick(10, 0.5);
      sfx.lose();
    }
  }

  collides(m: number[][], px: number, py: number) {
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const bx = px + x;
        const by = py + y;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    return false;
  }

  move(dx: number, dy: number) {
    const p = this.piece;
    if (this.collides(p.m, p.x + dx, p.y + dy)) return false;
    p.x += dx;
    p.y += dy;
    if (dx !== 0) this.resetLock();
    this.lastRotate = false;
    return true;
  }

  resetLock() {
    if (this.grounded() && this.lockMoves < 15) {
      this.lock = 0;
      this.lockMoves++;
    }
  }

  grounded() {
    return this.collides(this.piece.m, this.piece.x, this.piece.y + 1);
  }

  rotate(dir: 1 | -1) {
    const p = this.piece;
    if (p.kind === 'O') return;
    let m = rotateCW(p.m);
    if (dir === -1) m = rotateCW(rotateCW(m));
    const to = (p.rot + dir + 4) % 4;
    const table = p.kind === 'I' ? KICKS_I : KICKS;
    for (const [kx, ky] of table[`${p.rot}>${to}`]) {
      if (!this.collides(m, p.x + kx, p.y - ky)) {
        p.m = m;
        p.x += kx;
        p.y -= ky;
        p.rot = to;
        this.lastRotate = true;
        this.resetLock();
        sfx.tick();
        return;
      }
    }
  }

  ghostY() {
    let y = this.piece.y;
    while (!this.collides(this.piece.m, this.piece.x, y + 1)) y++;
    return y;
  }

  hardDrop() {
    const y = this.ghostY();
    const dist = y - this.piece.y;
    this.piece.y = y;
    this.score += dist * 2;
    this.shake.kick(3, 0.1);
    this.lockPiece(true);
  }

  holdPiece() {
    if (!this.canHold) return;
    const cur = this.piece.kind;
    if (this.hold) this.spawn(this.hold);
    else this.spawn();
    this.hold = cur;
    this.canHold = false;
    sfx.blip(440);
  }

  lockPiece(hard = false) {
    const p = this.piece;
    let tspinCorners = 0;
    if (p.kind === 'T') {
      for (const [cx, cy] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
        const bx = p.x + cx;
        const by = p.y + cy;
        if (bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && this.board[by][bx])) tspinCorners++;
      }
    }
    let above = false;
    p.m.forEach((row, y) =>
      row.forEach((v, x) => {
        if (!v) return;
        if (p.y + y < 0) above = true;
        else this.board[p.y + y][p.x + x] = p.kind;
      })
    );
    if (above) {
      this.dying = 1.2;
      sfx.lose();
      return;
    }
    sfx.thud();
    if (hard) for (let x = 0; x < p.m[0].length; x++) this.fx.burst(BX + (p.x + x + 0.5) * CELL, BY + (p.y + p.m.length) * CELL, COLORS[p.kind], 3, 90);

    const full = this.board.map((r, i) => (r.every(Boolean) ? i : -1)).filter((i) => i >= 0);
    const tspin = p.kind === 'T' && this.lastRotate && tspinCorners >= 3;
    if (full.length) {
      this.clearing = full;
      this.clearT = 0.22;
      this.combo++;
      const base = tspin ? [400, 800, 1200, 1600][full.length] : [0, 100, 300, 500, 800][full.length];
      const hardClear = full.length === 4 || tspin;
      let pts = base * this.level;
      if (hardClear && this.back2back) pts = Math.floor(pts * 1.5);
      this.back2back = hardClear;
      pts += 50 * this.combo * this.level;
      this.score += pts;
      const label = tspin ? `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][full.length]}` : ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'][full.length];
      const y = BY + full[0] * CELL;
      this.floaters.add(BX + (COLS * CELL) / 2, y, label, full.length === 4 ? C.yellow : C.text);
      if (this.combo > 0) this.floaters.add(BX + (COLS * CELL) / 2, y + 22, `COMBO ×${this.combo}`, C.peach);
      for (const row of full) for (let x = 0; x < COLS; x++) this.fx.burst(BX + (x + 0.5) * CELL, BY + (row + 0.5) * CELL, COLORS[this.board[row][x]!], 2, 200);
      this.shake.kick(full.length * 2.5, 0.2);
      full.length === 4 ? sfx.power() : sfx.coin();
    } else {
      this.combo = -1;
      if (tspin) this.score += 100 * this.level;
      this.spawn();
    }
    this.canHold = true;
  }

  finishClear() {
    const rows = new Set(this.clearing);
    const kept = this.board.filter((_, i) => !rows.has(i));
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
    this.board = kept;
    this.lines += rows.size;
    const lvl = Math.floor(this.lines / 10) + 1;
    if (lvl > this.level) {
      this.level = lvl;
      this.floaters.add(BX + (COLS * CELL) / 2, BY + (ROWS * CELL) / 2, `LEVEL ${lvl}`, C.green);
    }
    this.clearing = [];
    this.spawn();
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
    if (this.clearing.length) {
      this.clearT -= dt;
      if (this.clearT <= 0) this.finishClear();
      return;
    }

    if (input.pressed('b')) this.holdPiece();
    if (input.pressed('up') || input.pressed('KeyE')) this.rotate(1);
    if (input.pressed('KeyZ') || input.pressed('KeyQ')) this.rotate(-1);
    if (input.repeat('left', 0.16, 0.045)) this.move(-1, 0) && sfx.tick();
    if (input.repeat('right', 0.16, 0.045)) this.move(1, 0) && sfx.tick();
    if (input.pressed('a')) {
      this.hardDrop();
      return;
    }
    if (input.repeat('down', 0, 0.035)) {
      if (this.move(0, 1)) {
        this.score += 1;
        this.fall = 0;
      }
    }

    const g = GRAVITY[Math.min(this.level - 1, GRAVITY.length - 1)];
    if (this.grounded()) {
      this.lock += dt;
      if (this.lock >= 0.5) this.lockPiece();
    } else {
      this.fall += dt;
      while (this.fall >= g) {
        this.fall -= g;
        if (!this.move(0, 1)) break;
      }
    }
  }

  hud(): [string, string | number][] {
    return [['LVL', this.level], ['LINES', this.lines]];
  }

  cell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = CELL, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x + 1, y + 1, size - 2, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
    ctx.globalAlpha = 1;
  }

  mini(ctx: CanvasRenderingContext2D, kind: Kind, cx: number, cy: number, size = 14, alpha = 1) {
    const m = SHAPES[kind];
    const rows = m.filter((r) => r.some(Boolean));
    const cols = m[0].map((_, i) => m.some((r) => r[i]));
    const w = cols.filter(Boolean).length;
    const x0 = cols.indexOf(true);
    rows.forEach((r, y) => r.forEach((v, x) => {
      if (v) this.cell(ctx, cx - (w * size) / 2 + (x - x0) * size, cy - (rows.length * size) / 2 + y * size, COLORS[kind], size, alpha);
    }));
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H);
    ctx.save();
    this.shake.apply(ctx);

    // well
    ctx.fillStyle = C.crust;
    ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(BX + x * CELL + 0.5, BY);
      ctx.lineTo(BX + x * CELL + 0.5, BY + ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(BX, BY + y * CELL + 0.5);
      ctx.lineTo(BX + COLS * CELL, BY + y * CELL + 0.5);
      ctx.stroke();
    }

    const flashing = new Set(this.clearing);
    this.board.forEach((row, y) =>
      row.forEach((k, x) => {
        if (!k) return;
        if (flashing.has(y)) {
          const f = this.clearT / 0.22;
          this.cell(ctx, BX + x * CELL, BY + y * CELL, Math.floor(f * 8) % 2 ? C.bright : COLORS[k]);
        } else if (this.dying > 0 && y >= ROWS - Math.floor((1.2 - this.dying) * 22)) {
          this.cell(ctx, BX + x * CELL, BY + y * CELL, C.line);
        } else this.cell(ctx, BX + x * CELL, BY + y * CELL, COLORS[k]);
      })
    );

    if (!this.clearing.length && this.dying <= 0) {
      const p = this.piece;
      const gy = this.ghostY();
      p.m.forEach((row, y) =>
        row.forEach((v, x) => {
          if (!v) return;
          if (gy + y >= 0) {
            ctx.strokeStyle = COLORS[p.kind];
            ctx.globalAlpha = 0.45;
            ctx.strokeRect(BX + (p.x + x) * CELL + 2.5, BY + (gy + y) * CELL + 2.5, CELL - 5, CELL - 5);
            ctx.globalAlpha = 1;
          }
        })
      );
      const lockFade = this.grounded() ? 1 - (this.lock / 0.5) * 0.4 : 1;
      p.m.forEach((row, y) =>
        row.forEach((v, x) => {
          if (v && p.y + y >= 0) this.cell(ctx, BX + (p.x + x) * CELL, BY + (p.y + y) * CELL, COLORS[p.kind], CELL, lockFade);
        })
      );
    }
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(BX - 1, BY - 1, COLS * CELL + 2, ROWS * CELL + 2);

    // side panel
    const label = (s: string, y: number) => text(ctx, s, SIDE, y, { size: 11, color: C.muted, align: 'left', weight: 700 });
    label('NEXT', BY + 8);
    this.next.slice(0, 3).forEach((k, i) => this.mini(ctx, k, SIDE + 50, BY + 48 + i * 58, i === 0 ? 16 : 12, i === 0 ? 1 : 0.6));
    label('HOLD  [C/X]', BY + 212);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(SIDE + 0.5, BY + 226.5, 100, 64);
    if (this.hold) this.mini(ctx, this.hold, SIDE + 50, BY + 258, 16, this.canHold ? 1 : 0.35);

    label('LEVEL', BY + 320);
    text(ctx, String(this.level), SIDE, BY + 344, { size: 26, color: C.green, align: 'left', weight: 700 });
    label('LINES', BY + 380);
    text(ctx, String(this.lines), SIDE, BY + 404, { size: 26, color: C.text, align: 'left', weight: 700 });
    if (this.back2back) text(ctx, 'B2B', SIDE, BY + 440, { size: 12, color: C.peach, align: 'left', weight: 700, glow: 6 + Math.sin(t * 6) * 3 });
    text(ctx, '↑ ROT · Z CCW', SIDE, H - 42, { size: 9, color: C.dim, align: 'left' });
    text(ctx, 'SPACE DROP', SIDE, H - 28, { size: 9, color: C.dim, align: 'left' });

    this.fx.draw(ctx);
    this.floaters.draw(ctx, 16);
    ctx.restore();
  }
}

export const tetris: GameDef = {
  ...info('tetris'),
  controls: '←→ MOVE · ↑ ROTATE · SPACE DROP · C HOLD',
  color: C.mauve,
  width: W,
  height: H,
  icon: ['........', '.###....', '..#.....', '........', '....##..', '....##..', '.#......', '.###....'],
  touch: { dpad: 'full', a: 'DROP', b: 'HOLD' },
  storageKey: 'arcade-tetris-high',
  create: () => new Tetris(),
};
