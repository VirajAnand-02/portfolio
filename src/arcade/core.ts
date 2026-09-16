/* Shared arcade engine: game contract, input, sound, storage and drawing helpers.
   Games are plain classes that draw to a 2D canvas; <GameScreen /> owns the loop. */

// ---------- palette (Catppuccin Mocha, matches index.css; html.light inverts the whole page) ----------

export const C = {
  bg: '#141420',
  panel: '#1b1b2a',
  crust: '#0d0d15',
  grid: '#282939',
  line: '#34364b',
  dim: '#5a5e76',
  muted: '#8d93ad',
  text: '#cdd6f4',
  bright: '#f3f5ff',
  green: '#9fe597',
  teal: '#86e5d2',
  sky: '#7ddcf0',
  sapphire: '#68c3f3',
  blue: '#82acff',
  lavender: '#aeb8ff',
  mauve: '#c69cff',
  pink: '#f5b8e6',
  red: '#f7839f',
  maroon: '#ee97a5',
  peach: '#ffab78',
  yellow: '#fbdf9f',
  rosewater: '#f5dcd6',
} as const;

export const RAINBOW = [C.red, C.peach, C.yellow, C.green, C.teal, C.sky, C.blue, C.mauve, C.pink];

export const FONT = '"JetBrains Mono", ui-monospace, monospace';

// ---------- game contract ----------

export type Action = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';

export type PointerKind = 'down' | 'move' | 'up';
export type PointerEvt = { kind: PointerKind; x: number; y: number; button: number; pointerType: string };

export interface GameInstance {
  /** dt in seconds, clamped by the loop */
  update(dt: number, input: Input): void;
  draw(ctx: CanvasRenderingContext2D, t: number): void;
  readonly score: number;
  readonly over: boolean;
  /** set alongside `over` when the run ends in a win */
  readonly won?: boolean;
  /** extra HUD entries, e.g. [['LVL', 3], ['LIVES', 2]] */
  hud?(): [string, string | number][];
  /** pointer in logical canvas coordinates */
  pointer?(e: PointerEvt): void;
}

/** touch controls rendered under the canvas on coarse pointers */
export type TouchLayout = {
  dpad?: 'full' | 'horizontal' | 'vertical';
  a?: string;
  b?: string;
  /** game reads the canvas pointer directly (drag, tap, swipe) */
  pointer?: string;
};

export type GameDef = {
  id: string;
  title: string;
  tagline: string;
  controls: string;
  color: string;
  width: number;
  height: number;
  /** 8×8 pixel icon, '#' = lit */
  icon: string[];
  touch: TouchLayout;
  /** 'time' scores are seconds, lower is better, and only count when won */
  scoring?: 'points' | 'time';
  /** localStorage key; kept stable so existing high scores survive */
  storageKey: string;
  create(): GameInstance;
};

// ---------- input ----------

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyJ: 'a',
  KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyK: 'b', KeyC: 'b',
};

export const isGameKey = (code: string) => code in KEYMAP || code === 'KeyZ' || code === 'KeyQ' || code === 'KeyE';

export class Input {
  private held = new Set<string>();
  private fresh = new Set<string>();
  private holdTime = new Map<string, number>();

  keyDown(code: string) {
    const action = KEYMAP[code];
    for (const k of action ? [code, action] : [code]) {
      if (!this.held.has(k)) {
        this.fresh.add(k);
        this.holdTime.set(k, 0);
      }
      this.held.add(k);
    }
  }

  keyUp(code: string) {
    const action = KEYMAP[code];
    this.held.delete(code);
    this.holdTime.delete(code);
    // only release the action if no other key mapped to it is still held
    if (action && !Object.entries(KEYMAP).some(([c, a]) => a === action && this.held.has(c))) {
      this.held.delete(action);
      this.holdTime.delete(action);
    }
  }

  /** virtual buttons (touch) press actions directly */
  press(action: Action) {
    if (!this.held.has(action)) {
      this.fresh.add(action);
      this.holdTime.set(action, 0);
    }
    this.held.add(action);
  }

  release(action: Action) {
    this.held.delete(action);
    this.holdTime.delete(action);
  }

  releaseAll() {
    this.held.clear();
    this.fresh.clear();
    this.holdTime.clear();
  }

  isDown(k: Action | string) {
    return this.held.has(k);
  }

  /** true once per physical press */
  pressed(k: Action | string) {
    return this.fresh.has(k);
  }

  /** press + auto-repeat after `delay`, every `rate` seconds (DAS/ARR) */
  repeat(k: Action, delay = 0.17, rate = 0.05) {
    if (this.fresh.has(k)) return true;
    const t = this.holdTime.get(k);
    if (t === undefined || t < delay) return false;
    const prev = this.prevHold.get(k) ?? 0;
    return Math.floor((t - delay) / rate) !== Math.floor((prev - delay) / rate) || prev < delay;
  }

  private prevHold = new Map<string, number>();

  /** called by the loop after each update */
  endFrame(dt: number) {
    this.fresh.clear();
    this.prevHold = new Map(this.holdTime);
    for (const [k, t] of this.holdTime) this.holdTime.set(k, t + dt);
  }
}

// ---------- sound: one shared AudioContext, tiny synth ----------

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readBool('arcade-muted', false);

function readBool(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function ctx() {
  if (muted) return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      master = audioCtx.createGain();
      master.gain.value = 0.18;
      master.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('arcade-muted', m ? '1' : '0'); } catch { /* noop */ }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.5, slideTo?: number, delay = 0) {
  const ac = ctx();
  if (!ac || !master) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.4, lowpass = 1800) {
  const ac = ctx();
  if (!ac || !master) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export const sfx = {
  blip: (pitch = 660) => tone(pitch, 0.06, 'square', 0.35),
  tick: () => tone(1200, 0.025, 'square', 0.15),
  hit: (pitch = 440) => tone(pitch, 0.08, 'triangle', 0.6),
  coin: () => { tone(988, 0.07, 'square', 0.3); tone(1319, 0.18, 'square', 0.3, undefined, 0.07); },
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, 'square', 0.25, undefined, i * 0.06)),
  shoot: () => tone(880, 0.12, 'sawtooth', 0.18, 220),
  jump: () => tone(300, 0.14, 'square', 0.25, 700),
  boom: (size = 1) => { noise(0.25 + size * 0.2, 0.5, 900 + 600 / size); tone(120, 0.3, 'sine', 0.6 * size, 40); },
  thud: () => tone(160, 0.1, 'sine', 0.7, 60),
  lose: () => [440, 370, 311, 220].forEach((f, i) => tone(f, 0.18, 'square', 0.3, undefined, i * 0.15)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.28, undefined, i * 0.09)),
  start: () => [392, 523, 659].forEach((f, i) => tone(f, 0.08, 'square', 0.25, undefined, i * 0.07)),
};

// ---------- storage ----------

export function readBest(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/** returns true when `score` is a new record */
export function submitBest(key: string, score: number, mode: 'points' | 'time' = 'points'): boolean {
  const prev = readBest(key);
  const better = mode === 'time' ? score > 0 && (prev === 0 || score < prev) : score > prev;
  if (better) {
    try { localStorage.setItem(key, String(score)); } catch { /* noop */ }
  }
  return better;
}

export function bumpPlays(id: string) {
  try {
    const k = `arcade-plays-${id}`;
    localStorage.setItem(k, String((Number(localStorage.getItem(k)) || 0) + 1));
  } catch { /* noop */ }
}

export function readPlays(id: string) {
  try {
    return Number(localStorage.getItem(`arcade-plays-${id}`)) || 0;
  } catch {
    return 0;
  }
}

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const formatBest = (def: GameDef, v: number) => (v === 0 ? '—' : def.scoring === 'time' ? formatTime(v) : v.toLocaleString());

// ---------- math ----------

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
export const TAU = Math.PI * 2;

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- effects ----------

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; gravity: number };

export class Particles {
  items: Particle[] = [];

  burst(x: number, y: number, color: string, count = 12, speed = 160, opts: { size?: number; gravity?: number; life?: number } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.3 + Math.random() * 0.7);
      const life = (opts.life ?? 0.6) * (0.5 + Math.random() * 0.5);
      this.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: opts.size ?? 3, gravity: opts.gravity ?? 0 });
    }
    if (this.items.length > 600) this.items.splice(0, this.items.length - 600);
  }

  update(dt: number) {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 2 * dt;
      p.vy *= 1 - 2 * dt;
      p.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.items) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + 0.5 * (p.life / p.max));
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
}

export class Shake {
  private t = 0;
  private mag = 0;
  kick(mag: number, dur = 0.25) {
    this.mag = Math.max(this.mag * (this.t > 0 ? 1 : 0), mag);
    this.t = Math.max(this.t, dur);
  }
  update(dt: number) {
    this.t = Math.max(0, this.t - dt);
    if (this.t === 0) this.mag = 0;
  }
  apply(ctx: CanvasRenderingContext2D) {
    if (this.t <= 0) return;
    ctx.translate((Math.random() * 2 - 1) * this.mag, (Math.random() * 2 - 1) * this.mag);
  }
}

/** floating "+100" labels */
export class Floaters {
  items: { x: number; y: number; text: string; color: string; life: number }[] = [];
  add(x: number, y: number, text: string, color: string = C.yellow) {
    this.items.push({ x, y, text, color, life: 0.9 });
  }
  update(dt: number) {
    for (const f of this.items) {
      f.y -= 40 * dt;
      f.life -= dt;
    }
    this.items = this.items.filter((f) => f.life > 0);
  }
  draw(ctx: CanvasRenderingContext2D, size = 14) {
    for (const f of this.items) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      text(ctx, f.text, f.x, f.y, { size, color: f.color, weight: 700 });
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- drawing ----------

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  o: { size?: number; color?: string; align?: CanvasTextAlign; weight?: number; baseline?: CanvasTextBaseline; glow?: number } = {}
) {
  ctx.font = `${o.weight ?? 500} ${o.size ?? 14}px ${FONT}`;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = o.baseline ?? 'middle';
  ctx.fillStyle = o.color ?? C.text;
  if (o.glow) {
    ctx.shadowColor = o.color ?? C.text;
    ctx.shadowBlur = o.glow;
  }
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

export function glow(ctx: CanvasRenderingContext2D, color: string, blur: number, fn: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** draws a '#'-mask sprite; each char is `px` wide */
export function sprite(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, px: number, color: string) {
  ctx.fillStyle = color;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '.' && row[c] !== ' ') ctx.fillRect(x + c * px, y + r * px, px, px);
    }
  }
}

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number, color: string = C.bg) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

/** faint dot grid used as a backdrop by several games */
export function dotGrid(ctx: CanvasRenderingContext2D, w: number, h: number, step = 20, color: string = C.grid) {
  ctx.fillStyle = color;
  for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) ctx.fillRect(x - 1, y - 1, 2, 2);
}
