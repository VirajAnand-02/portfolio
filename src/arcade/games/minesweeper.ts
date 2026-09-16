import { info } from '../catalog';
import { C, clear, formatTime, GameDef, GameInstance, Input, Particles, PointerEvt, sfx, Shake, text } from '../core';

const COLS = 16;
const ROWS = 16;
const MINES = 40;
const CELL = 30;
const TOP = 44;
const W = COLS * CELL;
const H = TOP + ROWS * CELL;

const NUM_COLORS = ['', C.blue, C.green, C.red, C.mauve, C.peach, C.teal, C.pink, C.text];

type Cell = { mine: boolean; open: boolean; flag: boolean; n: number; revealT: number };

class Minesweeper implements GameInstance {
  cells: Cell[] = Array.from({ length: COLS * ROWS }, () => ({ mine: false, open: false, flag: false, n: 0, revealT: 0 }));
  placed = false;
  time = 0;
  over = false;
  won = false;
  ending = 0;
  boom: number | null = null;
  cursor = { r: 7, c: 7 };
  showCursor = false;
  flagMode = false;
  press: { i: number; t: number; x: number; y: number; long: boolean } | null = null;
  hover: number | null = null;
  fx = new Particles();
  shake = new Shake();

  get score() {
    return this.won ? Math.max(1, Math.ceil(this.time)) : 0;
  }

  idx(r: number, c: number) {
    return r * COLS + c;
  }

  neighbors(i: number) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(this.idx(nr, nc));
      }
    return out;
  }

  /** mines are placed on the first click so it always opens a clearing */
  place(safe: number) {
    const banned = new Set([safe, ...this.neighbors(safe)]);
    let n = 0;
    while (n < MINES) {
      const i = Math.floor(Math.random() * this.cells.length);
      if (banned.has(i) || this.cells[i].mine) continue;
      this.cells[i].mine = true;
      n++;
    }
    this.cells.forEach((cell, i) => (cell.n = this.neighbors(i).filter((j) => this.cells[j].mine).length));
    this.placed = true;
  }

  reveal(i: number) {
    if (this.ending > 0) return;
    const cell = this.cells[i];
    if (cell.flag) return;
    if (!this.placed) this.place(i);
    if (cell.open) {
      this.chord(i);
      return;
    }
    if (cell.mine) {
      this.explode(i);
      return;
    }
    // flood fill with a ripple delay by distance
    const r0 = Math.floor(i / COLS);
    const c0 = i % COLS;
    const stack = [i];
    let opened = 0;
    while (stack.length) {
      const j = stack.pop()!;
      const cj = this.cells[j];
      if (cj.open || cj.flag || cj.mine) continue;
      cj.open = true;
      cj.revealT = Math.hypot(Math.floor(j / COLS) - r0, (j % COLS) - c0) * 0.018;
      opened++;
      if (cj.n === 0) stack.push(...this.neighbors(j));
    }
    if (opened) sfx.blip(opened > 1 ? 520 : 760);
    this.checkWin();
  }

  chord(i: number) {
    const cell = this.cells[i];
    const around = this.neighbors(i);
    const flags = around.filter((j) => this.cells[j].flag).length;
    if (cell.n === 0 || flags !== cell.n) return;
    for (const j of around) if (!this.cells[j].open && !this.cells[j].flag) this.reveal(j);
  }

  toggleFlag(i: number) {
    const cell = this.cells[i];
    if (cell.open || this.ending > 0) return;
    cell.flag = !cell.flag;
    sfx.tick();
  }

  explode(i: number) {
    this.boom = i;
    this.ending = 2;
    for (const cell of this.cells) if (cell.mine) cell.open = true;
    const [x, y] = this.center(i);
    this.fx.burst(x, y, C.red, 50, 300, { gravity: 200 });
    this.shake.kick(12, 0.5);
    sfx.boom(1.2);
  }

  checkWin() {
    if (this.cells.every((c) => c.mine || c.open)) {
      this.won = true;
      this.ending = 2;
      for (const c of this.cells) if (c.mine) c.flag = true;
      for (let k = 0; k < 6; k++) this.fx.burst(Math.random() * W, TOP + Math.random() * (H - TOP), [C.green, C.yellow, C.mauve][k % 3], 24, 240);
      sfx.win();
    }
  }

  center(i: number) {
    return [(i % COLS) * CELL + CELL / 2, TOP + Math.floor(i / COLS) * CELL + CELL / 2];
  }

  cellAt(x: number, y: number) {
    const c = Math.floor(x / CELL);
    const r = Math.floor((y - TOP) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return this.idx(r, c);
  }

  pointer(e: PointerEvt) {
    // top bar: flag-mode toggle for touch players
    if (e.kind === 'down' && e.y < TOP && e.x > W - 120) {
      this.flagMode = !this.flagMode;
      sfx.tick();
      return;
    }
    const i = this.cellAt(e.x, e.y);
    this.hover = i;
    if (e.kind === 'down') {
      this.showCursor = false;
      if (i === null) return;
      if (e.button === 2) {
        this.toggleFlag(i);
        return;
      }
      this.press = { i, t: 0, x: e.x, y: e.y, long: false };
    } else if (e.kind === 'move' && this.press && Math.hypot(e.x - this.press.x, e.y - this.press.y) > 12) {
      this.press = null;
    } else if (e.kind === 'up' && this.press) {
      const p = this.press;
      this.press = null;
      if (p.long) return;
      if (this.flagMode && !this.cells[p.i].open) this.toggleFlag(p.i);
      else this.reveal(p.i);
    }
  }

  hud(): [string, string | number][] {
    const flags = this.cells.filter((c) => c.flag).length;
    return [['MINES', MINES - flags], ['TIME', formatTime(this.time)]];
  }

  update(dt: number, input: Input) {
    this.fx.update(dt);
    this.shake.update(dt);
    for (const c of this.cells) c.revealT = Math.max(0, c.revealT - dt);
    if (this.ending > 0) {
      this.ending -= dt;
      if (this.ending <= 0) this.over = true;
      return;
    }
    if (this.placed) this.time += dt;

    // long press flags on touch
    if (this.press && !this.press.long) {
      this.press.t += dt;
      if (this.press.t > 0.38) {
        this.press.long = true;
        this.toggleFlag(this.press.i);
        navigator.vibrate?.(20);
      }
    }

    const moves: [string, number, number][] = [['up', -1, 0], ['down', 1, 0], ['left', 0, -1], ['right', 0, 1]];
    for (const [k, dr, dc] of moves) {
      if (input.repeat(k as 'up', 0.2, 0.06)) {
        this.showCursor = true;
        this.cursor.r = (this.cursor.r + dr + ROWS) % ROWS;
        this.cursor.c = (this.cursor.c + dc + COLS) % COLS;
      }
    }
    const ci = this.idx(this.cursor.r, this.cursor.c);
    if (input.pressed('a')) {
      this.showCursor = true;
      this.reveal(ci);
    }
    if (input.pressed('b') || input.pressed('KeyF')) {
      this.showCursor = true;
      this.toggleFlag(ci);
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    clear(ctx, W, H, C.crust);
    ctx.save();
    this.shake.apply(ctx);

    // top bar
    const flags = this.cells.filter((c) => c.flag).length;
    text(ctx, `✹ ${String(MINES - flags).padStart(2, '0')}`, 12, TOP / 2, { size: 18, color: C.red, align: 'left', weight: 700 });
    text(ctx, formatTime(this.time), W / 2, TOP / 2, { size: 18, color: C.text, weight: 700 });
    ctx.strokeStyle = this.flagMode ? C.peach : C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(W - 112, 8, 104, TOP - 16, 6);
    ctx.stroke();
    text(ctx, this.flagMode ? '⚑ FLAGGING' : '⚑ DIGGING', W - 60, TOP / 2, { size: 11, color: this.flagMode ? C.peach : C.muted, weight: 700 });

    this.cells.forEach((cell, i) => {
      const x = (i % COLS) * CELL;
      const y = TOP + Math.floor(i / COLS) * CELL;
      const shown = cell.open && cell.revealT <= 0;
      if (!shown) {
        const hot = this.hover === i && this.ending <= 0;
        ctx.fillStyle = hot ? '#4a4d68' : '#3b3d55';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 1, y + 1, CELL - 2, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 1, y + CELL - 4, CELL - 2, 3);
        if (cell.flag) {
          ctx.fillStyle = C.text;
          ctx.fillRect(x + 11, y + 7, 2, 16);
          ctx.fillStyle = C.red;
          ctx.beginPath();
          ctx.moveTo(x + 13, y + 7);
          ctx.lineTo(x + 22, y + 11);
          ctx.lineTo(x + 13, y + 15);
          ctx.fill();
          // wrong flags revealed on loss
          if (this.boom !== null && !cell.mine) {
            ctx.strokeStyle = C.yellow;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 6);
            ctx.lineTo(x + CELL - 6, y + CELL - 6);
            ctx.moveTo(x + CELL - 6, y + 6);
            ctx.lineTo(x + 6, y + CELL - 6);
            ctx.stroke();
          }
        }
        return;
      }
      ctx.fillStyle = i === this.boom ? C.red : '#1a1a28';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      if (cell.mine) {
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;
        ctx.fillStyle = i === this.boom ? C.crust : C.text;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        for (let a = 0; a < 4; a++) {
          const ang = (a / 4) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(ang) * 11, cy - Math.sin(ang) * 11);
          ctx.lineTo(cx + Math.cos(ang) * 11, cy + Math.sin(ang) * 11);
          ctx.stroke();
        }
      } else if (cell.n > 0) {
        text(ctx, String(cell.n), x + CELL / 2, y + CELL / 2 + 1, { size: 17, color: NUM_COLORS[cell.n], weight: 700 });
      }
    });

    if (this.showCursor && this.ending <= 0) {
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.4;
      ctx.strokeRect(this.cursor.c * CELL + 2, TOP + this.cursor.r * CELL + 2, CELL - 4, CELL - 4);
      ctx.globalAlpha = 1;
    }

    if (!this.placed) text(ctx, 'FIRST CLICK IS ALWAYS SAFE', W / 2, TOP + (ROWS * CELL) / 2, { size: 13, color: C.muted, glow: 4 + Math.sin(t * 4) * 3 });
    if (this.won && this.ending > 0) text(ctx, `CLEARED IN ${formatTime(this.time)}`, W / 2, TOP + (ROWS * CELL) / 2, { size: 28, color: C.green, weight: 700, glow: 16 });

    this.fx.draw(ctx);
    ctx.restore();
  }
}

export const minesweeper: GameDef = {
  ...info('minesweeper'),
  controls: 'CLICK · RIGHT-CLICK FLAG · ARROWS + SPACE/X',
  color: C.teal,
  width: W,
  height: H,
  icon: ['........', '.#.#.#..', '..###...', '.#####..', '..###...', '.#.#.#..', '........', '........'],
  touch: { pointer: 'TAP · HOLD TO FLAG' },
  scoring: 'time',
  storageKey: 'arcade-mines-best',
  create: () => new Minesweeper(),
};
