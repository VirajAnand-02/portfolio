import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX, X, LayoutGrid } from 'lucide-react';
import { Action, bumpPlays, formatBest, GameDef, GameInstance, Input, isGameKey, isMuted, readBest, readPlays, setMuted, sfx, submitBest } from './core';
import { GAMES, findGame } from './games';

type Phase = 'ready' | 'playing' | 'paused' | 'over';

const useCoarsePointer = () => {
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
};

const useMute = () => {
  const [muted, set] = useState(isMuted);
  const toggle = useCallback(() => {
    setMuted(!isMuted());
    set(isMuted());
  }, []);
  return [muted, toggle] as const;
};

/* ---------------------------------------------------------------- icons */

export const PixelIcon = ({ rows, color, size = 40 }: { rows: string[]; color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    {rows.flatMap((row, y) => [...row].map((ch, x) => (ch === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
  </svg>
);

const IconBtn = ({ onClick, label, children, danger }: { onClick: () => void; label: string; children: React.ReactNode; danger?: boolean }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`p-2 border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors ${danger ? 'hover:text-red-400 hover:border-red-500/50' : 'hover:text-accent-400 hover:border-accent-500/50'}`}
  >
    {children}
  </button>
);

/* ---------------------------------------------------------------- touch pad */

const PadButton = ({ action, input, children, className = '', primary }: { action: Action; input: Input; children: React.ReactNode; className?: string; primary?: boolean }) => {
  const [down, setDown] = useState(false);
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    input.press(action);
    setDown(true);
    navigator.vibrate?.(8);
  };
  const release = () => {
    input.release(action);
    setDown(false);
  };
  return (
    <button
      aria-label={action}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none touch-none flex items-center justify-center border font-mono font-bold transition-colors ${down ? 'bg-accent-500/25 border-accent-400 text-accent-300' : primary ? 'bg-zinc-900/80 border-accent-500/60 text-accent-400' : 'bg-zinc-900/80 border-zinc-700 text-zinc-400'} ${className}`}
    >
      {children}
    </button>
  );
};

const TouchControls = ({ def, input }: { def: GameDef; input: Input }) => {
  const t = def.touch;
  if (t.pointer && !t.dpad && !t.a) {
    return <p className="text-center text-xs text-zinc-500 font-mono py-3">{t.pointer}</p>;
  }
  const size = 'w-14 h-14';
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      {t.dpad === 'full' ? (
        <div className="grid grid-cols-3 gap-1">
          <div />
          <PadButton action="up" input={input} className={size}><ArrowUp className="w-6 h-6" /></PadButton>
          <div />
          <PadButton action="left" input={input} className={size}><ArrowLeft className="w-6 h-6" /></PadButton>
          <PadButton action="down" input={input} className={size}><ArrowDown className="w-6 h-6" /></PadButton>
          <PadButton action="right" input={input} className={size}><ArrowRight className="w-6 h-6" /></PadButton>
        </div>
      ) : t.dpad === 'horizontal' ? (
        <div className="flex gap-2">
          <PadButton action="left" input={input} className="w-16 h-16"><ArrowLeft className="w-7 h-7" /></PadButton>
          <PadButton action="right" input={input} className="w-16 h-16"><ArrowRight className="w-7 h-7" /></PadButton>
        </div>
      ) : (
        <div />
      )}
      <div className="flex gap-2 items-end">
        {t.b && <PadButton action="b" input={input} className="w-16 h-16 rounded-full text-xs">{t.b}</PadButton>}
        {t.a && <PadButton action="a" input={input} primary className="w-20 h-20 rounded-full text-sm mb-4">{t.a}</PadButton>}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- game screen */

type Hud = { score: number; extras: [string, string | number][] };

const GameScreen = ({ def, onMenu, onExit }: { def: GameDef; onMenu: () => void; onExit: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameInstance>(null!);
  if (!gameRef.current) gameRef.current = def.create();
  const inputRef = useRef(new Input());
  const phaseRef = useRef<Phase>('ready');
  const overAtRef = useRef(0);
  const [phase, setPhaseState] = useState<Phase>('ready');
  const [hud, setHud] = useState<Hud>({ score: 0, extras: [] });
  const [best, setBest] = useState(() => readBest(def.storageKey));
  const [newBest, setNewBest] = useState(false);
  const [fit, setFit] = useState({ w: def.width, h: def.height });
  const [muted, toggleMute] = useMute();
  const coarse = useCoarsePointer();

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
    inputRef.current.releaseAll();
  }, []);

  const start = useCallback(() => {
    if (phaseRef.current === 'over') gameRef.current = def.create();
    setNewBest(false);
    bumpPlays(def.id);
    sfx.start();
    setPhase('playing');
  }, [def, setPhase]);

  const restart = useCallback(() => {
    gameRef.current = def.create();
    setNewBest(false);
    setHud({ score: 0, extras: [] });
    bumpPlays(def.id);
    sfx.start();
    setPhase('playing');
  }, [def, setPhase]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused');
    else if (phaseRef.current === 'paused') setPhase('playing');
  }, [setPhase]);

  // fit the logical canvas into the stage, preserving aspect ratio
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const scale = Math.min(r.width / def.width, r.height / def.height, 2);
      setFit({ w: Math.floor(def.width * scale), h: Math.floor(def.height * scale) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [def]);

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let lastHud = '';
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const game = gameRef.current;
      const input = inputRef.current;
      if (phaseRef.current === 'playing') {
        game.update(dt, input);
        input.endFrame(dt);
        if (game.over) {
          const record = submitBest(def.storageKey, game.score, def.scoring ?? 'points') && (def.scoring !== 'time' || !!game.won);
          setNewBest(record && game.score > 0);
          setBest(readBest(def.storageKey));
          overAtRef.current = now;
          if (record && game.score > 0) sfx.power();
          setPhase('over');
        }
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.setTransform(cw / def.width, 0, 0, ch / def.height, 0, 0);
      ctx.imageSmoothingEnabled = false;
      game.draw(ctx, now / 1000);

      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.08;
        const next: Hud = { score: game.score, extras: game.hud?.() ?? [] };
        const key = JSON.stringify(next);
        if (key !== lastHud) {
          lastHud = key;
          setHud(next);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [def, setPhase]);

  // keyboard
  useEffect(() => {
    const input = inputRef.current;
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const p = phaseRef.current;
      if (isGameKey(e.code) || e.code === 'Escape') e.preventDefault();
      if (e.code === 'KeyM') return toggleMute();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (p === 'playing' || p === 'paused') togglePause();
        else if (p === 'ready' || p === 'over') onMenu();
        return;
      }
      if (p === 'playing') {
        if (e.code === 'KeyR' && !e.repeat) return restart();
        input.keyDown(e.code);
        return;
      }
      if (e.repeat) return;
      const confirm = e.code === 'Space' || e.code === 'Enter';
      if (p === 'ready' && (confirm || isGameKey(e.code))) start();
      if (p === 'paused' && confirm) togglePause();
      if (p === 'paused' && e.code === 'KeyR') restart();
      // brief lockout so a key held through the death doesn't instantly restart
      if (p === 'over' && (confirm || e.code === 'KeyR') && performance.now() - overAtRef.current > 600) restart();
    };
    const up = (e: KeyboardEvent) => input.keyUp(e.code);
    const blur = () => {
      input.releaseAll();
      if (phaseRef.current === 'playing') setPhase('paused');
    };
    const vis = () => document.hidden && blur();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [start, restart, togglePause, onMenu, toggleMute, setPhase]);

  const toLogical = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * def.width, y: ((e.clientY - r.top) / r.height) * def.height };
  };

  const onPointer = (kind: 'down' | 'move' | 'up') => (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = phaseRef.current;
    if (kind === 'down') {
      if (p === 'ready') return start();
      if (p !== 'playing') return;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (p !== 'playing') return;
    const { x, y } = toLogical(e);
    gameRef.current.pointer?.({ kind, x, y, button: e.button, pointerType: e.pointerType });
  };

  const isTime = def.scoring === 'time';
  const game = gameRef.current;
  const overTitle = def.scoring === 'time' ? (game.won ? 'CLEARED' : 'BOOM') : game.won ? 'YOU WIN' : 'GAME OVER';

  return (
    <div className="relative z-10 flex flex-col w-full h-full">
      {/* top bar */}
      <div className="flex items-center gap-3 px-3 sm:px-5 py-2.5 border-b border-zinc-800/80 bg-ctp-mantle/80 backdrop-blur">
        <button onClick={onMenu} className="flex items-center gap-2 text-zinc-400 hover:text-accent-400 transition-colors shrink-0" title="Game select (Esc)">
          <PixelIcon rows={def.icon} color={def.color} size={22} />
          <span className="font-bold tracking-widest text-sm hidden sm:inline" style={{ color: def.color }}>{def.title}</span>
        </button>
        <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6 text-xs font-mono overflow-hidden">
          {!isTime && (
            <span className="flex flex-col items-center leading-tight">
              <span className="text-[10px] text-zinc-500">SCORE</span>
              <span className="text-base text-zinc-100 tabular-nums font-bold">{hud.score.toLocaleString()}</span>
            </span>
          )}
          {hud.extras.map(([k, v]) => (
            <span key={k} className="flex flex-col items-center leading-tight">
              <span className="text-[10px] text-zinc-500">{k}</span>
              <span className="text-sm text-zinc-300 tabular-nums">{v}</span>
            </span>
          ))}
          <span className="flex flex-col items-center leading-tight text-yellow-400">
            <span className="text-[10px] text-yellow-400/70 flex items-center gap-1"><Trophy className="w-3 h-3" />BEST</span>
            <span className="text-sm tabular-nums">{formatBest(def, best)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <IconBtn onClick={toggleMute} label={muted ? 'Unmute (M)' : 'Mute (M)'}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</IconBtn>
          {(phase === 'playing' || phase === 'paused') && (
            <IconBtn onClick={togglePause} label={phase === 'paused' ? 'Resume (Esc)' : 'Pause (Esc)'}>{phase === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</IconBtn>
          )}
          <IconBtn onClick={onExit} label="Exit arcade" danger><X className="w-4 h-4" /></IconBtn>
        </div>
      </div>

      {/* stage */}
      <div className="flex-1 min-h-[240px] relative">
        <div ref={stageRef} className="absolute inset-3 sm:inset-6 flex items-center justify-center">
        <div className="relative" style={{ width: fit.w, height: fit.h }}>
          <canvas
            ref={canvasRef}
            className="block w-full h-full touch-none border border-zinc-800 shadow-[0_0_40px_rgb(var(--accent-rgb)/0.08)]"
            style={{ imageRendering: 'auto' }}
            onPointerDown={onPointer('down')}
            onPointerMove={onPointer('move')}
            onPointerUp={onPointer('up')}
            onPointerCancel={onPointer('up')}
            onContextMenu={(e) => e.preventDefault()}
          />

          {phase === 'ready' && (
            <button onClick={start} className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ctp-crust/70 backdrop-blur-[2px] text-center px-6">
              <PixelIcon rows={def.icon} color={def.color} size={56} />
              <h2 className="text-4xl sm:text-5xl font-bold tracking-[0.2em]" style={{ color: def.color, textShadow: `0 0 24px ${def.color}66` }}>{def.title}</h2>
              <p className="text-zinc-400 text-sm max-w-xs">{def.tagline}</p>
              <p className="text-zinc-500 text-xs">{def.controls}</p>
              <span className="mt-2 text-accent-400 text-sm animate-pulse">{coarse ? '▶ TAP TO START' : '▶ PRESS SPACE TO START'}</span>
            </button>
          )}

          {phase === 'paused' && (
            <div className="absolute inset-0 flex items-center justify-center bg-ctp-crust/80 backdrop-blur-sm">
              <div className="flex flex-col items-stretch gap-2 min-w-[220px] border border-accent-500/50 bg-zinc-900/90 p-6 shadow-[0_0_30px_rgb(var(--accent-rgb)/0.15)]">
                <h2 className="text-2xl text-accent-400 text-center mb-3 tracking-[0.3em]">PAUSED</h2>
                <MenuItem onClick={togglePause} hint="ESC">Resume</MenuItem>
                <MenuItem onClick={restart} hint="R">Restart</MenuItem>
                <MenuItem onClick={onMenu}>Game select</MenuItem>
                <MenuItem onClick={onExit} danger>Exit arcade</MenuItem>
              </div>
            </div>
          )}

          {phase === 'over' && (
            <div className="absolute inset-0 flex items-center justify-center bg-ctp-crust/75 backdrop-blur-[2px]">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 border border-zinc-700 bg-zinc-900/95 px-8 py-6 text-center min-w-[240px]"
              >
                <h2 className={`text-3xl font-bold tracking-widest ${game.won ? 'text-accent-400' : 'text-red-400'}`}>{overTitle}</h2>
                {isTime ? (
                  game.won && <p className="text-zinc-300 text-lg tabular-nums">{formatBest(def, game.score)}</p>
                ) : (
                  <p className="text-zinc-100 text-3xl font-bold tabular-nums">{hud.score.toLocaleString()}</p>
                )}
                {newBest ? (
                  <motion.p animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-yellow-400 text-sm font-bold flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> NEW BEST
                  </motion.p>
                ) : (
                  <p className="text-zinc-500 text-xs">BEST {formatBest(def, best)}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={restart} className="flex items-center gap-2 border border-accent-500 bg-accent-500/10 text-accent-400 px-4 py-2 text-sm hover:bg-accent-500/20 transition-colors">
                    <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                  </button>
                  <button onClick={onMenu} className="flex items-center gap-2 border border-zinc-700 text-zinc-400 px-4 py-2 text-sm hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                    <LayoutGrid className="w-4 h-4" /> MENU
                  </button>
                </div>
                {!coarse && <p className="text-[10px] text-zinc-600 mt-2">SPACE RETRY · ESC MENU</p>}
              </motion.div>
            </div>
          )}
        </div>
        </div>
      </div>

      {coarse ? (
        <div className="border-t border-zinc-800/80 bg-ctp-mantle/80">
          <TouchControls def={def} input={inputRef.current} />
        </div>
      ) : (
        <p className="text-center text-[11px] text-zinc-600 pb-3 font-mono">{def.controls} · ESC PAUSE · R RESTART · M MUTE</p>
      )}
    </div>
  );
};

const MenuItem = ({ onClick, children, hint, danger }: { onClick: () => void; children: React.ReactNode; hint?: string; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between gap-6 px-4 py-2 text-left border border-transparent transition-colors ${danger ? 'text-zinc-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 mt-2' : 'text-zinc-300 hover:text-accent-300 hover:border-accent-500/40 hover:bg-accent-500/5'}`}
  >
    <span>&gt; {children}</span>
    {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
  </button>
);

/* ---------------------------------------------------------------- menu */

const Menu = ({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) => {
  const [sel, setSel] = useState(0);
  const selRef = useRef(0);
  selRef.current = sel;
  const [muted, toggleMute] = useMute();
  const cols = useColumns();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bests = GAMES.map((g) => readBest(g.storageKey));
  const plays = GAMES.map((g) => readPlays(g.id));
  const totalPlays = plays.reduce((a, b) => a + b, 0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = GAMES.length;
      const move = (d: number) => {
        e.preventDefault();
        setSel((s) => (s + d + n) % n);
        sfx.tick();
      };
      if (e.key === 'ArrowRight' || e.key === 'd') move(1);
      else if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
      else if (e.key === 'ArrowDown' || e.key === 's') move(cols);
      else if (e.key === 'ArrowUp' || e.key === 'w') move(-cols);
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPick(GAMES[selRef.current].id);
      } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) onPick(GAMES[Number(e.key) - 1].id);
      else if (e.key === 'm' || e.key === 'M') toggleMute();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cols, onPick, onClose, toggleMute]);

  useEffect(() => {
    cardRefs.current[sel]?.focus({ preventScroll: false });
  }, [sel]);

  return (
    <div className="relative z-10 flex flex-col items-center w-full max-w-5xl mx-auto px-4 pt-4 pb-8 sm:pb-12">
      <div className="self-end flex gap-1.5 mb-2 sm:mb-4">
        <IconBtn onClick={toggleMute} label={muted ? 'Unmute (M)' : 'Mute (M)'}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</IconBtn>
        <IconBtn onClick={onClose} label="Exit arcade (Esc)" danger><X className="w-4 h-4" /></IconBtn>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: -10, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, y: 0, letterSpacing: '0.25em' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-5xl sm:text-7xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-b from-accent-300 to-accent-700"
      >
        ARCADE
      </motion.h1>
      <p className="text-zinc-500 text-xs sm:text-sm mb-8 text-center">
        {GAMES.length} games · high scores saved on this device{totalPlays ? ` · ${totalPlays} credits spent` : ''}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {GAMES.map((g, i) => (
          <motion.button
            key={g.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.035 }}
            onClick={() => onPick(g.id)}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            className={`group relative text-left border p-4 flex gap-4 items-start outline-none transition-all ${sel === i ? 'bg-zinc-900/90 -translate-y-0.5' : 'border-zinc-800 bg-zinc-900/40'}`}
            style={sel === i ? { borderColor: g.color, boxShadow: `0 0 24px ${g.color}26` } : undefined}
          >
            <div className="shrink-0 p-2 border border-zinc-800 bg-ctp-crust/60">
              <PixelIcon rows={g.icon} color={g.color} size={40} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold tracking-widest" style={{ color: sel === i ? g.color : undefined }}>{g.title}</span>
                <span className="text-[10px] text-zinc-600 border border-zinc-800 px-1.5">{i + 1}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1 line-clamp-2">{g.tagline}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className="text-yellow-400 flex items-center gap-1"><Trophy className="w-3 h-3" />{formatBest(g, bests[i])}</span>
                {plays[i] > 0 && <span className="text-zinc-600">{plays[i]} plays</span>}
              </div>
            </div>
            {sel === i && <Play className="absolute bottom-3 right-3 w-4 h-4" style={{ color: g.color }} />}
          </motion.button>
        ))}
      </div>

      <p className="mt-8 text-[11px] text-zinc-600 text-center hidden sm:block">
        ARROWS SELECT · ENTER PLAY · 1–{GAMES.length} QUICK LAUNCH · M MUTE · ESC EXIT
      </p>
    </div>
  );
};

/** matches the menu grid's responsive column count, for arrow-key navigation */
function useColumns() {
  const get = () => (window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const on = () => setCols(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return cols;
}

/* ---------------------------------------------------------------- shell */

export default function ArcadeMode({ onClose, initialGame }: { onClose: () => void; initialGame?: string | null }) {
  const [active, setActive] = useState<GameDef | null>(() => (initialGame ? findGame(initialGame) ?? null : null));

  // lock page scroll while the arcade is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const pick = useCallback((id: string) => {
    const g = findGame(id);
    if (g) {
      sfx.coin();
      setActive(g);
    }
  }, []);
  const toMenu = useCallback(() => setActive(null), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-ctp-mantle text-zinc-300 font-mono flex flex-col overflow-y-auto"
      role="dialog"
      aria-label="Arcade"
    >
      <div className="pointer-events-none fixed inset-0 z-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] opacity-40" />
      <div className="pointer-events-none fixed inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]" />
      {active ? <React.Fragment key={active.id}><GameScreen def={active} onMenu={toMenu} onExit={onClose} /></React.Fragment> : <Menu onPick={pick} onClose={onClose} />}
    </motion.div>
  );
}
