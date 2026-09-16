import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent, useMotionValue,
  useDragControls, useAnimationControls, useReducedMotion, animate as animateValue
} from 'motion/react';
import {
  Github, Linkedin, Mail, MapPin, Twitter, Code2, Server,
  Database, Cloud, Wrench, Terminal as TerminalIcon, BookOpen, Award, GraduationCap,
  X, ArrowRight, ArrowUp, ArrowDown, ArrowLeft, Sun, Moon, Trophy,
  Play, ChevronRight, Globe, Star, Filter, Zap, Shield, LayoutGrid,
  Search, Copy, Check, Clock, ArrowUpRight, Send, Hash, Minus, Maximize2, Minimize2, PenLine, Rss
} from 'lucide-react';
import { SectionHeading, TONES, tagTone, trackSpot, useActiveSection } from './ui';
import { Link, matchRoute, navigate, usePath } from './router';
import { formatDate, getIndex, usePosts } from './blog/data';
import BlogIndex from './blog/BlogIndex';
import BlogPost from './blog/BlogPost';
import { CATALOG, GAME_IDS, findGameId } from './arcade/catalog';

const loadArcade = () => import('./arcade/Arcade');
const ArcadeMode = lazy(loadArcade);

/* ============================== DATA (synced with resume, legacy kept) ============================== */

const PROFILE = {
  name: 'Viraj Anand',
  role: 'BACKEND / AI',
  tagline: 'B.Tech CSE @ University of Kalyani — GATE 8939 (2025) → 3460 (2026). Seeking entry-level Backend & AI roles.',
  summary:
    'B.Tech CSE student at University of Kalyani with GATE ranks of 8939 (2025) and 3460 (2026). Interested in entry-level opportunities in Backend Development and AI. Built hands-on projects in scalable backend systems, automation pipelines, and AI-based solutions using Node.js and Python.',
  email: 'iamtheviraj@gmail.com',
  github: 'https://github.com/VirajAnand-02',
  linkedin: 'https://linkedin.com/in/viraj-anand',
  twitter: 'https://x.com/Viraj_Anand_02',
  location: 'Kalyani, West Bengal, India',
  grad: 'June 2026',
};

const skills = [
  { category: 'Programming', icon: <TerminalIcon className="w-5 h-5" />, tone: TONES.mauve, items: ['Python', 'C', 'C++', 'JavaScript', 'TypeScript'] },
  { category: 'Backend', icon: <Server className="w-5 h-5" />, tone: TONES.blue, items: ['Node.js', 'Express', 'FastAPI', 'REST APIs'] },
  { category: 'Frontend', icon: <LayoutGrid className="w-5 h-5" />, tone: TONES.sky, items: ['React', 'Next.js'] },
  { category: 'Automation', icon: <Code2 className="w-5 h-5" />, tone: TONES.yellow, items: ['n8n', 'Puppeteer', 'FFmpeg', 'Webhooks'] },
  { category: 'Databases', icon: <Database className="w-5 h-5" />, tone: TONES.peach, items: ['SQL', 'PostgreSQL', 'Prisma ORM', 'Supabase'] },
  { category: 'Cloud', icon: <Cloud className="w-5 h-5" />, tone: TONES.sapphire, items: ['Google Cloud', 'WhatsApp Cloud API'] },
  { category: 'Tools', icon: <Wrench className="w-5 h-5" />, tone: TONES.pink, items: ['Git', 'Linux', 'Docker', 'Raspberry Pi', 'Arduino'] },
  { category: 'Interests', icon: <BookOpen className="w-5 h-5" />, tone: TONES.green, items: ['Backend Eng.', 'ESP32', 'IoT', 'AI', 'Edge AI'] },
];

export type Project = {
  title: string;
  tech: string[];
  description: string;
  details?: string[];
  repo: boolean;
  repoLink?: string;
  liveLink?: string;
  liveLabel?: string;
  tags: string[];
  isNew?: boolean;
  featured?: boolean;
};

const projects: Project[] = [
  {
    title: 'nb-make — Notebook Builder',
    tech: ['Next.js', 'TypeScript', 'Supabase'],
    description:
      'Browser-based notebook designer that compiles page templates to a shared drawing model rendered to SVG previews and print-ready PDFs, with saddle-stitch imposition.',
    details: [
      'Compiles page templates to a shared drawing model → SVG previews + print-ready PDFs',
      'Saddle-stitch imposition for real book printing',
      'Local-first sync + template-sharing community on Postgres row-level security',
    ],
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02/nb-make',
    liveLink: 'https://nb-make.vrj02.dev',
    liveLabel: 'nb-make.vrj02.dev',
    tags: ['Web', 'Backend'],
    isNew: true,
    featured: true,
  },
  {
    title: 'Manimate — AI Video Generator',
    tech: ['Next.js', 'TypeScript', 'Python (Manim)', 'Vercel AI SDK', 'Kokoro TTS', 'FFmpeg'],
    description:
      'Automated video generation platform with an LLM self-correcting Manim compiler loop, local ONNX voiceover synthesis, and dynamic FFmpeg timing alignment.',
    details: [
      'LLM self-correcting Manim compiler loop',
      'Local ONNX (Kokoro) voiceover synthesis — no paid TTS APIs',
      'Dynamic FFmpeg timing alignment for narration + animation',
    ],
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02/manimate_uni',
    tags: ['AI', 'Backend', 'Automation', 'Web'],
    isNew: true,
    featured: true,
  },
  {
    title: 'CBIS (Content-Based Image Search)',
    tech: ['Next.js', 'Python', 'FastAPI', 'PostgreSQL (Prisma ORM)'],
    description:
      'Microservices-based image search system leveraging CLIP for semantic search, RetinaFace/ArcFace for face recognition, OCR, and NIMA for quality scoring, with pgvector-powered similarity indexing.',
    details: [
      'CLIP semantic search + RetinaFace/ArcFace face recognition + OCR + NIMA quality scoring',
      'pgvector similarity indexing via Prisma ORM',
      'Microservices split: ingest / embed / search API',
    ],
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02/CBIS',
    tags: ['AI', 'Backend', 'Web'],
    featured: true,
  },
  {
    title: 'ChatTranslator Extension',
    tech: ['JavaScript', 'WebExtensions API'],
    description: 'Browser extension enabling real-time translation directly within WhatsApp Web.',
    details: ['In-page live translation overlay for WhatsApp Web', 'WebExtensions API, no backend dependency'],
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02/ChatTranslator',
    tags: ['Web', 'Automation'],
  },
  {
    title: 'Cogni-Glove Wearable',
    tech: ['Arduino', 'C++', 'JavaScript'],
    description: 'Wearable input device prototype with real-time backend monitoring and interaction tracking.',
    details: ['Glove-based input prototype on Arduino', 'Real-time backend status monitor + interaction tracking'],
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02/cogni-glove',
    tags: ['Embedded'],
  },
  {
    title: 'Autonomous Vehicle Prototype (IEEE CIS)',
    tech: ['ESP32-S3', 'Tiny-YOLO', 'Sensors'],
    description: 'On-device object detection and sensor fusion, optimized inference for real-time performance on low-power hardware.',
    details: ['Tiny-YOLO on ESP32-S3 with sensor fusion', 'Inference optimized for low-power real-time use'],
    repo: false,
    tags: ['Embedded', 'AI'],
  },
  {
    title: 'Backend & Automation Platform (Reachify)',
    tech: ['Node.js', 'Express', 'MongoDB'],
    description: 'Core backend services, WhatsApp Cloud API integrations, and Puppeteer-based browser automation workflows. (Legacy / pre-resume — kept for history.)',
    repo: false,
    tags: ['Backend', 'Automation'],
  },
  {
    title: 'IoT Environment Monitoring System',
    tech: ['Arduino', 'Python', 'Express.js'],
    description: 'Full-stack sensor logging system with real-time data streaming and a web-based dashboard. (Legacy — kept for history.)',
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02?tab=repositories',
    tags: ['Embedded', 'Backend'],
  },
  {
    title: 'AI-Driven Marketing Automation',
    tech: ['Puppeteer', 'FFmpeg', 'Webhooks'],
    description: 'Backend pipelines for automated video outreach and bulk media processing. (Legacy — kept for history.)',
    repo: false,
    tags: ['Automation', 'Backend'],
  },
  {
    title: 'FlappyMatrix',
    tech: ['Arduino', 'C++'],
    description: 'Classic Flappy Bird game logic and rendering on an 8×8 LED matrix using optimized C++. (Legacy — kept for history.)',
    repo: true,
    repoLink: 'https://github.com/VirajAnand-02?tab=repositories',
    tags: ['Embedded'],
  },
];

const education = [
  {
    degree: 'B.Tech in Computer Science and Engineering',
    institution: 'University of Kalyani',
    date: 'Nov 2022 – June 2026',
    details: 'CGPA: 8.4/10 · GATE 2025 Rank: 8939 · GATE 2026 Rank: 3460',
    highlight: 'GATE 3460 (2026)',
  },
  {
    degree: 'Higher Secondary (Class 12, CBSE)',
    institution: 'Delhi Public School, Bhagalpur',
    date: '2022',
    details: 'Marks: 89.6%',
    highlight: null as string | null,
  },
  {
    degree: 'Secondary (Class 10, CBSE)',
    institution: 'Delhi Public School, Bhagalpur',
    date: '2020',
    details: 'Marks: 90.8%',
    highlight: null as string | null,
  },
];

const certifications = [
  'Introduction to Generative AI & Digital Transformation (Google Cloud)',
  'Infrastructure, Application Modernization, Security & Operations (Google Cloud)',
  'Learn C++',
];

const FILTERS = ['All', 'AI', 'Backend', 'Web', 'Embedded', 'Automation'];

/* ============================== Konami hint (decorative) ============================== */

const KonamiHint = () => {
  const sequence = [
    { icon: <ArrowUp className="w-4 h-4" />, key: 'up1' },
    { icon: <ArrowUp className="w-4 h-4" />, key: 'up2' },
    { icon: <ArrowDown className="w-4 h-4" />, key: 'down1' },
    { icon: <ArrowDown className="w-4 h-4" />, key: 'down2' },
    { icon: <ArrowLeft className="w-4 h-4" />, key: 'left1' },
    { icon: <ArrowRight className="w-4 h-4" />, key: 'right1' },
    { icon: <ArrowLeft className="w-4 h-4" />, key: 'left2' },
    { icon: <ArrowRight className="w-4 h-4" />, key: 'right2' },
    { text: 'B', key: 'b' },
    { text: 'A', key: 'a' },
  ];
  const randomAnim = React.useMemo(
    () =>
      sequence.map(() => ({
        y: [0, -(Math.random() * 6 + 2), 0],
        x: [0, Math.random() * 4 - 2, 0],
        duration: Math.random() * 2 + 2,
        delay: Math.random() * 2,
      })),
    []
  );
  return (
    <div className="flex gap-2 items-center justify-center opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-help" title="Try this sequence...">
      {sequence.map((item, i) => (
        <motion.div
          key={item.key}
          animate={{ y: randomAnim[i].y, x: randomAnim[i].x }}
          transition={{ duration: randomAnim[i].duration, repeat: Infinity, delay: randomAnim[i].delay, ease: 'easeInOut' }}
          className="flex items-center justify-center w-7 h-7 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 shadow-sm"
        >
          {item.icon || <span className="text-sm font-bold">{item.text}</span>}
        </motion.div>
      ))}
    </div>
  );
};

const ProfilePhoto = () => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };
  return (
    <div
      ref={containerRef}
      className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 border border-zinc-700/50 bg-zinc-900/50 p-1.5 relative group overflow-hidden cursor-crosshair select-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onDragStart={(e) => e.preventDefault()}
      style={{ '--mouse-x': `${mousePos.x}%`, '--mouse-y': `${mousePos.y}%` } as React.CSSProperties}
    >
      <img src="/profile.png" alt="Viraj Anand" draggable={false} onDragStart={(e) => e.preventDefault()} className="w-full h-full object-cover grayscale contrast-125 transition-all duration-300 group-hover:sepia group-hover:hue-rotate-[35deg] group-hover:saturate-[160%] group-hover:brightness-90 select-none pointer-events-none" />
      <div className="absolute inset-1.5 pointer-events-none transition-opacity duration-300 z-10"
        style={{ opacity: isHovering ? 1 : 0, maskImage: `radial-gradient(circle 80px at var(--mouse-x) var(--mouse-y), black 0%, transparent 100%)`, WebkitMaskImage: `radial-gradient(circle 80px at var(--mouse-x) var(--mouse-y), black 0%, transparent 100%)` }}>
        <img src="/profile.png" alt="" draggable={false} onDragStart={(e) => e.preventDefault()} className="w-full h-full object-cover sepia hue-rotate-[35deg] saturate-[160%] contrast-[150%] brightness-90 select-none pointer-events-none" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `linear-gradient(to right, var(--color-ctp-base) 1px, transparent 1px), linear-gradient(to bottom, var(--color-ctp-base) 1px, transparent 1px)`, backgroundSize: 'calc(100% / 32) calc(100% / 32)' }} />
      </div>
      <div className="absolute inset-1.5 pointer-events-none transition-opacity duration-300 z-10"
        style={{ opacity: isHovering ? 1 : 0, maskImage: `radial-gradient(circle 45px at var(--mouse-x) var(--mouse-y), black 0%, transparent 100%)`, WebkitMaskImage: `radial-gradient(circle 45px at var(--mouse-x) var(--mouse-y), black 0%, transparent 100%)` }}>
        <img src="/profile.png" alt="" draggable={false} onDragStart={(e) => e.preventDefault()} className="w-full h-full object-cover sepia hue-rotate-[35deg] saturate-[160%] contrast-[150%] brightness-90 select-none pointer-events-none" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute inset-0 opacity-90" style={{ backgroundImage: `linear-gradient(to right, var(--color-ctp-base) 2px, transparent 2px), linear-gradient(to bottom, var(--color-ctp-base) 2px, transparent 2px)`, backgroundSize: 'calc(100% / 16) calc(100% / 16)' }} />
      </div>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent-500 opacity-50 group-hover:opacity-100 transition-opacity z-20"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-accent-500 opacity-50 group-hover:opacity-100 transition-opacity z-20"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-accent-500 opacity-50 group-hover:opacity-100 transition-opacity z-20"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent-500 opacity-50 group-hover:opacity-100 transition-opacity z-20"></div>
    </div>
  );
};

/* ============================== ARCADE (src/arcade) ============================== */

const useKonamiCode = (callback: () => void) => {
  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          callback();
          konamiIndex = 0;
        }
      } else {
        konamiIndex = e.key === konamiCode[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
};

/* ============================== INTERACTIVE TERMINAL ============================== */

type TermLine = { id: number; kind: 'in' | 'out' | 'sys' | 'err' | 'node'; text?: string; node?: React.ReactNode; ok?: boolean };

const TERMINAL_COMMANDS = ['help', 'whoami', 'about', 'skills', 'projects', 'project', 'blog', 'read', 'education', 'gate', 'contact', 'open', 'echo', 'date', 'clear', 'history', 'arcade', 'play', 'theme', 'neofetch', 'ls', 'cat', 'sudo', 'exit'];

const ARG_COMPLETIONS: Record<string, string[]> = {
  play: GAME_IDS,
  open: ['github', 'linkedin', 'email', 'nb-make'],
  projects: ['ai', 'backend', 'web', 'embedded', 'automation'],
  theme: ['dark', 'light'],
  cat: ['resume'],
  read: [],
  blog: [],
};

// post slugs / tags become tab completions once the blog index has loaded
getIndex().then((posts) => {
  ARG_COMPLETIONS.read = posts.map((p) => p.slug);
  ARG_COMPLETIONS.blog = [...new Set(posts.flatMap((p) => p.tags))];
});

const QUICK_COMMANDS = ['help', 'neofetch', 'projects', 'blog', 'skills', 'gate', 'contact', 'play snake'];

function completionContext(input: string) {
  const parts = input.split(' ');
  if (parts.length === 1) return { head: '', partial: parts[0].toLowerCase(), options: TERMINAL_COMMANDS };
  if (parts.length === 2) return { head: `${parts[0]} `, partial: parts[1].toLowerCase(), options: ARG_COMPLETIONS[parts[0].toLowerCase()] ?? [] };
  return null;
}

// zsh-autosuggestions style: the dim remainder of the first matching completion
function ghostFor(input: string) {
  const ctx = completionContext(input);
  if (!ctx || !input) return '';
  const match = ctx.options.find((o) => o.startsWith(ctx.partial) && o !== ctx.partial);
  return match ? match.slice(ctx.partial.length) : '';
}

function commandClass(word: string) {
  const w = word.toLowerCase();
  if (!w) return '';
  if (TERMINAL_COMMANDS.includes(w)) return 'text-accent-400';
  if (TERMINAL_COMMANDS.some((c) => c.startsWith(w))) return 'text-zinc-100';
  return 'text-red-400';
}

const HighlightedCommand = ({ text }: { text: string }) => {
  const cut = text.indexOf(' ') === -1 ? text.length : text.indexOf(' ');
  return (
    <>
      <span className={commandClass(text.slice(0, cut))}>{text.slice(0, cut)}</span>
      <span className="text-teal-200">{text.slice(cut)}</span>
    </>
  );
};

const LINK_RE = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[a-z.]+)/gi;

const linkify = (row: string) =>
  row.split(LINK_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part.startsWith('http') ? part : `mailto:${part}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-accent-500/40 underline-offset-2 hover:decoration-accent-300 hover:text-accent-300 transition-colors"
      >
        {part}
      </a>
    ) : (
      part
    )
  );

const TermText = ({ text, kind }: { text: string; kind: TermLine['kind'] }) => {
  const color = kind === 'err' ? 'text-red-400' : kind === 'sys' ? 'text-zinc-500' : 'text-accent-400';
  return (
    <div className={color}>
      {text.split('\n').map((row, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18, delay: Math.min(i * 0.022, 0.5) }}>
          {row ? linkify(row) : ' '}
        </motion.div>
      ))}
    </div>
  );
};

const PromptGlyph = ({ ok, pop }: { ok: boolean; pop?: boolean }) => (
  <span className="shrink-0 select-none">
    <motion.span
      key={pop ? String(ok) : undefined}
      initial={pop ? { scale: 1.7, opacity: 0.3 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={`inline-block ${ok ? 'text-accent-400' : 'text-red-400'}`}
    >
      ➜
    </motion.span>
    <span className="text-cyan-400 ml-2">~</span>
  </span>
);

const BootLine = ({ msg }: { msg: string }) => (
  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
    <span className="text-zinc-600">[</span>
    <span className="text-accent-400">  OK  </span>
    <span className="text-zinc-600">]</span> <span className="text-zinc-400">{msg}</span>
  </motion.div>
);

const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

const SpinnerLine = ({ label, done, ms = 550 }: { label: string; done: string; ms?: number }) => {
  const [frame, setFrame] = useState(0);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const spin = setInterval(() => setFrame((f) => (f + 1) % SPINNER.length), 70);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setFinished(true);
    }, ms);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
  }, [ms]);
  return (
    <div className="text-zinc-400">
      {finished ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }} className="inline-block text-accent-400">✓</motion.span>
      ) : (
        <span className="text-accent-400">{SPINNER[frame]}</span>
      )}{' '}
      {finished ? done : label}
    </div>
  );
};

/* ---------- neofetch ---------- */

const FALLBACK_LOGO = [
  '██╗   ██╗ █████╗ ',
  '██║   ██║██╔══██╗',
  '██║   ██║███████║',
  '╚██╗ ██╔╝██╔══██║',
  ' ╚████╔╝ ██║  ██║',
  '  ╚═══╝  ╚═╝  ╚═╝',
];

const ASCII_RAMP = " .':-~=+*oa#%&@";
const ASCII_COLS = 44;
let asciiPortrait: Promise<string[]> | null = null;

// Converts /profile.png to ASCII: head-and-shoulders crop, oval vignette, wall knocked out,
// and a blend of linear stretch + histogram equalisation so the face keeps some detail.
function loadAsciiPortrait(): Promise<string[]> {
  if (asciiPortrait) return asciiPortrait;
  asciiPortrait = new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(FALLBACK_LOGO);
    img.onload = () => {
      try {
        const cols = ASCII_COLS;
        const [sx, sy, sw, sh] = [img.width * 0.2, img.height * 0.1, img.width * 0.8, img.height * 0.8];
        const rows = Math.round(((sh / sw) * cols) / 1.85);
        const mid = document.createElement('canvas');
        mid.width = cols * 4;
        mid.height = rows * 4;
        const canvas = document.createElement('canvas');
        canvas.width = cols;
        canvas.height = rows;
        const mctx = mid.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!mctx || !ctx) return resolve(FALLBACK_LOGO);
        mctx.imageSmoothingQuality = 'high';
        mctx.drawImage(img, sx, sy, sw, sh, 0, 0, mid.width, mid.height);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(mid, 0, 0, cols, rows);
        const d = ctx.getImageData(0, 0, cols, rows).data;

        const WALL = 0.74;
        const lum: number[] = [];
        const oval: number[] = [];
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            lum.push((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255);
            const dx = ((x + 0.5) / cols - 0.52) / 0.52;
            const dy = ((y + 0.5) / rows - 0.5) / 0.55;
            oval.push(dx * dx + dy * dy);
          }
        }
        const fg = lum.filter((l, i) => oval[i] <= 1 && l <= WALL).sort((a, b) => a - b);
        const lo = fg[0] ?? 0;
        const hi = fg[fg.length - 1] ?? 1;
        const rank = (l: number) => {
          let a = 0, b = fg.length;
          while (a < b) {
            const m = (a + b) >> 1;
            if (fg[m] < l) a = m + 1;
            else b = m;
          }
          return a / (fg.length || 1);
        };

        const out: string[] = [];
        for (let y = 0; y < rows; y++) {
          let s = '';
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            let dens = 0;
            if (oval[i] <= 1 && lum[i] <= WALL) {
              const n = Math.min(1, Math.max(0, ((lum[i] - lo) / (hi - lo || 1)) * 0.6 + rank(lum[i]) * 0.4));
              dens = Math.pow(1 - n, 0.8) * (oval[i] > 0.75 ? (1 - oval[i]) / 0.25 : 1);
            }
            s += ASCII_RAMP[Math.round(dens * (ASCII_RAMP.length - 1))];
          }
          out.push(s.replace(/\s+$/, ''));
        }
        resolve(out);
      } catch {
        resolve(FALLBACK_LOGO);
      }
    };
    img.src = '/profile.png';
  });
  return asciiPortrait;
}

const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#%@01';

// decrypt-style reveal that sweeps diagonally from the top-left
function useScrambleReveal(lines: string[] | null, duration = 1200) {
  const [frame, setFrame] = useState<string[] | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!lines) return;
    if (reduce) {
      setFrame(lines);
      return;
    }
    const width = Math.max(...lines.map((l) => l.length), 1);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / duration;
      setFrame(
        lines.map((line, r) => {
          let s = '';
          for (let c = 0; c < line.length; c++) {
            const ch = line[c];
            const at = (r / lines.length) * 0.55 + (c / width) * 0.45;
            if (ch === ' ' || t < at - 0.06) s += ' ';
            else if (t < at + 0.12) s += SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
            else s += ch;
          }
          return s;
        })
      );
      if (t < 1.15) raf = requestAnimationFrame(tick);
      else setFrame(lines);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, duration, reduce]);
  return frame;
}

const NEOFETCH_COLORS = [
  ['bg-zinc-800', 'bg-red-500', 'bg-accent-500', 'bg-yellow-500', 'bg-blue-500', 'bg-fuchsia-500', 'bg-cyan-500', 'bg-zinc-300'],
  ['bg-zinc-600', 'bg-red-400', 'bg-accent-300', 'bg-yellow-300', 'bg-blue-400', 'bg-fuchsia-400', 'bg-cyan-300', 'bg-white'],
];

const formatUptime = (ms: number) => {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const parts = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (mins % 60 || hours) parts.push(`${mins % 60} min${mins % 60 === 1 ? '' : 's'}`);
  parts.push(`${secs % 60} sec${secs % 60 === 1 ? '' : 's'}`);
  return parts.join(', ');
};

const Neofetch = () => {
  const [art, setArt] = useState<string[] | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const frame = useScrambleReveal(art);
  const [env] = useState(() => ({
    resolution: `${window.screen.width}x${window.screen.height}`,
    theme: document.documentElement.classList.contains('light') ? 'light' : 'dark',
  }));

  useEffect(() => {
    let alive = true;
    loadAsciiPortrait().then((a) => alive && setArt(a));
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const info: [string, string][] = [
    ['OS', 'VIRAJ.OS 2.0 x86_64'],
    ['Host', 'University of Kalyani · B.Tech CSE'],
    ['Kernel', '6.2026-gate-air3460'],
    ['Uptime', formatUptime(now)],
    ['Packages', `${skills.reduce((n, s) => n + s.items.length, 0)} (skills), ${projects.length} (projects)`],
    ['Shell', 'vsh 2.0'],
    ['Resolution', env.resolution],
    ['Theme', `Catppuccin Mocha [${env.theme}]`],
    ['Terminal', 'viraj-term'],
    ['CPU', 'Backend / AI (8) @ Node.js + Python'],
    ['GPU', 'ESP32-S3 · Tiny-YOLO'],
    ['Memory', 'CGPA 8.4 / 10'],
    ['Locale', 'Kalyani, WB (IST)'],
  ];
  const artRows = art?.length ?? 24;
  const infoDelay = 0.25;

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-7 py-3">
      <div className="relative shrink-0 self-start overflow-hidden" style={{ width: `${ASCII_COLS}ch`, fontSize: 10, lineHeight: 1.1, height: `${artRows * 1.1}em` }} aria-label="ASCII portrait of Viraj" role="img">
        <pre className="m-0 font-mono text-transparent bg-clip-text bg-gradient-to-b from-ctp-mauve via-ctp-blue to-ctp-teal select-none" style={{ font: 'inherit' }}>
          {(frame ?? []).join('\n')}
        </pre>
        {art && (
          <motion.div
            className="absolute inset-x-0 h-10 pointer-events-none bg-gradient-to-b from-transparent via-accent-300/25 to-transparent"
            initial={{ top: '-15%', opacity: 1 }}
            animate={{ top: '105%', opacity: 0.2 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        )}
      </div>

      <div className="min-w-0 text-[13px] leading-[1.45]">
        <div className="font-bold">
          {'viraj@portfolio'.split('').map((ch, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }} className={ch === '@' ? 'text-zinc-300' : 'text-accent-400'}>
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div className="text-zinc-500" initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 0.35, delay: 0.35 }}>
          {'-'.repeat(15)}
        </motion.div>
        {info.map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: infoDelay + 0.2 + i * 0.05, duration: 0.2 }}
            className="group/row -mx-1.5 px-1.5 rounded-sm hover:bg-accent-500/10 transition-colors cursor-default"
          >
            <span className="text-ctp-mauve font-bold group-hover/row:text-ctp-pink">{k}</span>
            <span className="text-zinc-500">: </span>
            <span className="text-zinc-200">{v}</span>
          </motion.div>
        ))}
        <div className="mt-3 space-y-0.5">
          {NEOFETCH_COLORS.map((row, r) => (
            <div key={r} className="flex">
              {row.map((c, i) => (
                <motion.span
                  key={c}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22, delay: infoDelay + 0.2 + info.length * 0.05 + (r * 8 + i) * 0.025 }}
                  className={`${c} inline-block w-[3ch] h-[1.2em]`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- the window ---------- */

let terminalBooted = false;
let lastLogin: Date | null = null;

const formatLogin = (d: Date) =>
  d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const TerminalOverlay = ({
  onClose,
  onLaunchArcade,
  onToggleTheme,
}: {
  onClose: () => void;
  onLaunchArcade: (game?: string | null) => void;
  onToggleTheme: () => void;
}) => {
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState('');
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(true);
  const [typing, setTyping] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [lastOk, setLastOk] = useState(true);
  const [lastCmd, setLastCmd] = useState<string | null>(null);
  const [errFlash, setErrFlash] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [autoTyping, setAutoTyping] = useState(false);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);
  const dragControls = useDragControls();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const shake = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const print = useCallback((newLines: Omit<TermLine, 'id'>[]) => {
    setLines((prev) => [...prev, ...newLines.map((l) => ({ ...l, id: lineId.current++ }))]);
  }, []);

  // boot sequence on the first open of the session, "Last login" after that
  useEffect(() => {
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (!terminalBooted) {
      const steps = [
        `Mounted /home/viraj/projects (${projects.length} modules)`,
        `Started skills-matrix.service (${skills.reduce((n, s) => n + s.items.length, 0)} entries)`,
        'Reached target gate-rank.target (AIR 3460)',
        `Started arcade.socket (${CATALOG.length} games)`,
        'Started vsh — the viraj shell',
      ];
      steps.forEach((msg, i) => later(60 + i * 110, () => print([{ kind: 'node', node: <BootLine msg={msg} /> }])));
      later(60 + steps.length * 110 + 180, () => {
        terminalBooted = true;
        lastLogin = new Date();
        print([
          { kind: 'sys', text: '\nVIRAJ.OS v2.0 (tty1) — type `help` to see what I can do.' },
          { kind: 'in', text: 'neofetch', ok: true },
          { kind: 'node', node: <Neofetch /> },
          { kind: 'sys', text: 'Tip: tab completes, → accepts a suggestion, or tap a command below.' },
        ]);
      });
    } else {
      later(0, () => {
        print([
          { kind: 'sys', text: `Last login: ${formatLogin(lastLogin ?? new Date())} on ttys001` },
          { kind: 'sys', text: 'Tip: tab completes, → accepts a suggestion, or tap a command below.' },
        ]);
        lastLogin = new Date();
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [print]);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [lines, reduceMotion]);

  const replaceInput = (value: string) => {
    setInput(value);
    setCaret(value.length);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(value.length, value.length));
  };

  const markTyping = () => {
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 450);
  };

  const signalError = () => {
    setErrFlash(true);
    window.setTimeout(() => setErrFlash(false), 450);
    if (!reduceMotion) shake.start({ x: [0, -9, 8, -6, 4, -2, 0], transition: { duration: 0.4 } });
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const runCommand = (raw: string) => {
    const cmd = raw.trim();
    print([{ kind: 'in', text: cmd, ok: lastOk }]);
    if (!cmd) return;
    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHistIdx(-1);
    setLastCmd(cmd.split(/\s+/)[0]);
    const [base, ...args] = cmd.split(/\s+/);
    const arg = args.join(' ');
    const lower = base.toLowerCase();
    let ok = true;

    const out = (text: string, kind: TermLine['kind'] = 'out') => {
      if (kind === 'err') ok = false;
      print([{ text, kind }]);
    };
    const spin = (label: string, done: string, ms?: number) => print([{ kind: 'node', node: <SpinnerLine label={label} done={done} ms={ms} /> }]);

    switch (lower) {
      case 'help':
        out(`COMMANDS:\n  help              show this message\n  whoami / about    professional summary\n  skills            grouped skill matrix\n  projects [tag]    list projects (tags: ai backend web embedded automation)\n  project <n>       project details, e.g. project 1\n  blog [tag]        list blog posts\n  read <n|slug>     open a blog post\n  education         degrees + marks\n  gate              GATE ranks\n  contact           email / location / socials\n  open <target>     open github | linkedin | email | nb-make\n  arcade            open game arcade\n  play <game>       launch a game (tab lists them)\n  theme [dark|light]  switch site theme\n  echo <text>       print text\n  date              current date/time\n  neofetch          system specs\n  ls / cat resume   easter eggs\n  history           previous commands\n  clear             clear screen (or ctrl+L)\n  exit              close terminal\n\nKEYS: tab complete · → accept suggestion · ↑/↓ history · ctrl+C cancel`);
        break;
      case 'whoami':
      case 'about':
        out(`${PROFILE.name} — ${PROFILE.role}\n${PROFILE.summary}\n\nOpen to work · B.Tech CSE, class of 2026 · press ${MOD_KEY} for the command palette`);
        break;
      case 'skills':
        out(skills.map((s) => `▸ ${s.category}: ${s.items.join(', ')}`).join('\n'));
        break;
      case 'projects': {
        const tag = (args[0] || '').toLowerCase();
        const list = tag ? projects.filter((p) => p.tags.map((t) => t.toLowerCase()).includes(tag)) : projects;
        if (list.length === 0) {
          out(`No projects tagged "${tag}". Try: ai backend web embedded automation`, 'err');
        } else {
          out(list.map((p) => `${projects.indexOf(p) + 1}. ${p.title}\n   [${p.tech.join(' · ')}]\n   ${p.description}`).join('\n\n'));
          out(`\nTip: type \`project <n>\` for deep-dive (numbers above).`, 'sys');
        }
        break;
      }
      case 'project': {
        const n = parseInt(args[0] || '', 10);
        if (!n || n < 1 || n > projects.length) {
          out(`Usage: project <1-${projects.length}> — run \`projects\` to see the list.`, 'err');
        } else {
          const p = projects[n - 1];
          out(`▸ ${p.title}\nTech: ${p.tech.join(', ')}\n${p.description}${p.details ? '\n\n· ' + p.details.join('\n· ') : ''}${p.repoLink ? `\n\nSource: ${p.repoLink}` : ''}${p.liveLink ? `\nLive: ${p.liveLink}` : ''}`);
        }
        break;
      }
      case 'education':
        out(education.map((e) => `▸ ${e.degree}\n  ${e.institution} — ${e.date}\n  ${e.details}`).join('\n\n'));
        break;
      case 'gate':
        out(`GATE 2025 — Rank 8939\nGATE 2026 — Rank 3460  (2.6× improvement)\nCGPA 8.4/10 · B.Tech CSE, University of Kalyani (2022–2026)`);
        break;
      case 'contact':
        out(`Email: ${PROFILE.email}\nLocation: ${PROFILE.location}\nGitHub: ${PROFILE.github}\nLinkedIn: ${PROFILE.linkedin}\nX: ${PROFILE.twitter}`);
        break;
      case 'open': {
        const targets: Record<string, [string, string]> = {
          github: [PROFILE.github, 'GitHub'],
          linkedin: [PROFILE.linkedin, 'LinkedIn'],
          email: [`mailto:${PROFILE.email}`, 'mail client'],
          mail: [`mailto:${PROFILE.email}`, 'mail client'],
          'nb-make': ['https://nb-make.vrj02.dev', 'nb-make'],
          nbmake: ['https://nb-make.vrj02.dev', 'nb-make'],
        };
        const t = targets[(args[0] || '').toLowerCase()];
        if (t) {
          openUrl(t[0]);
          spin(`Opening ${t[1]}…`, `Opened ${t[1]}`, 450);
        } else {
          out('Usage: open <github|linkedin|email|nb-make>', 'err');
        }
        break;
      }
      case 'arcade':
        spin('Booting arcade…', 'Arcade ready', 550);
        setTimeout(() => onLaunchArcade(null), 700);
        break;
      case 'play': {
        const id = findGameId(args[0] || '');
        if (id) {
          spin(`Loading ${id}…`, `Launching ${id}`, 550);
          setTimeout(() => onLaunchArcade(id), 700);
        } else {
          out(`Usage: play <game>
Games: ${GAME_IDS.join(', ')}`, 'err');
        }
        break;
      }
      case 'theme': {
        const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
        const want = arg.toLowerCase();
        if (want && want !== 'dark' && want !== 'light') {
          out('Usage: theme [dark|light]', 'err');
        } else if (want === current) {
          out(`Theme is already ${current}.`, 'sys');
        } else {
          onToggleTheme();
          out(`Theme switched to ${current === 'dark' ? 'light' : 'dark'}.`);
        }
        break;
      }
      case 'echo':
        out(arg || '');
        break;
      case 'date':
        out(new Date().toString());
        break;
      case 'neofetch':
        print([{ kind: 'node', node: <Neofetch /> }]);
        break;
      case 'blog': {
        const tag = (args[0] || '').toLowerCase();
        getIndex().then((posts) => {
          const list = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
          if (posts.length === 0) {
            print([{ kind: 'sys', text: 'total 0 — no posts yet.' }]);
          } else if (list.length === 0) {
            print([{ kind: 'err', text: `No posts tagged "${tag}".` }]);
            setLastOk(false);
            signalError();
          } else {
            print([
              { kind: 'out', text: list.map((p) => `${posts.indexOf(p) + 1}. ${p.title}\n   ${p.date} · ${p.readingMinutes} min${p.tags.length ? ` · #${p.tags.join(' #')}` : ''}\n   ${p.description}`).join('\n\n') },
              { kind: 'sys', text: '\nTip: `read <n>` opens a post.' },
            ]);
          }
        });
        break;
      }
      case 'read': {
        const target = (args[0] || '').toLowerCase();
        if (!target) {
          out('Usage: read <n|slug> — run `blog` to see the list.', 'err');
          break;
        }
        getIndex().then((posts) => {
          const n = parseInt(target, 10);
          const post = String(n) === target ? posts[n - 1] : posts.find((p) => p.slug === target);
          if (!post) {
            print([{ kind: 'err', text: `read: ${target}: no such post. Run \`blog\` to see the list.` }]);
            setLastOk(false);
            signalError();
            return;
          }
          print([{ kind: 'node', node: <SpinnerLine label={`Opening “${post.title}”…`} done={`Opened “${post.title}”`} ms={450} /> }]);
          window.setTimeout(() => {
            navigate(`/blog/${post.slug}`);
            onClose();
          }, 600);
        });
        break;
      }
      case 'ls':
        out(`resume.txt  projects/  skills/  blog/  arcade/  contact.txt`);
        break;
      case 'cat':
        if ((args[0] || '').toLowerCase().startsWith('resume')) out(PROFILE.summary);
        else out(`cat: ${args[0] || ''}: No such file. Try \`cat resume\``, 'err');
        break;
      case 'sudo':
        out(`Nice try. You are already root here. 😎`, 'sys');
        break;
      case 'clear':
        setLines([]);
        break;
      case 'history':
        out(history.map((h, i) => `${history.length - i}. ${h}`).join('\n') || '(empty)');
        break;
      case 'exit':
        onClose();
        break;
      default:
        out(`vsh: command not found: ${base}. Type \`help\`.`, 'err');
    }

    setLastOk(ok);
    if (!ok) signalError();
  };

  const autoType = (cmd: string) => {
    if (autoTyping) return;
    setAutoTyping(true);
    setMinimized(false);
    inputRef.current?.focus();
    replaceInput('');
    let i = 0;
    const step = () => {
      i++;
      const value = cmd.slice(0, i);
      setInput(value);
      setCaret(value.length);
      markTyping();
      if (i < cmd.length) {
        window.setTimeout(step, 30 + Math.random() * 45);
      } else {
        window.setTimeout(() => {
          runCommand(cmd);
          replaceInput('');
          setAutoTyping(false);
        }, 200);
      }
    };
    window.setTimeout(step, 80);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (autoTyping) {
      e.preventDefault();
      return;
    }
    const atEnd = caret >= input.length;
    if (e.key === 'Enter') {
      runCommand(input);
      replaceInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      replaceInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx <= 0) {
        setHistIdx(-1);
        replaceInput('');
      } else {
        const next = histIdx - 1;
        setHistIdx(next);
        replaceInput(history[next]);
      }
    } else if (e.key === 'ArrowRight' && atEnd && ghostFor(input)) {
      e.preventDefault();
      replaceInput(input + ghostFor(input));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const ctx = completionContext(input);
      if (!ctx) return;
      const matches = ctx.options.filter((o) => o.startsWith(ctx.partial));
      if (matches.length === 1) {
        replaceInput(`${ctx.head}${matches[0]} `);
      } else if (matches.length > 1) {
        const common = matches.reduce((a, b) => {
          let i = 0;
          while (i < a.length && a[i] === b[i]) i++;
          return a.slice(0, i);
        });
        if (common.length > ctx.partial.length) replaceInput(ctx.head + common);
        else print([{ kind: 'in', text: input, ok: lastOk }, { kind: 'sys', text: matches.join('   ') }]);
      }
    } else if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault();
      print([{ kind: 'in', text: `${input}^C`, ok: lastOk }]);
      replaceInput('');
      setLastOk(false);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? input.length);

  const toggleMaximize = () => {
    setMaximized((m) => !m);
    setMinimized(false);
    animateValue(dragX, 0, { type: 'spring', stiffness: 400, damping: 36 });
    animateValue(dragY, 0, { type: 'spring', stiffness: 400, damping: 36 });
  };

  const width = maximized ? viewport.w - 24 : Math.min(820, viewport.w - 24);
  const height = minimized ? 44 : maximized ? viewport.h - 24 : Math.min(Math.round(viewport.h * 0.74), 700);
  const ghost = focused && caret >= input.length ? ghostFor(input) : '';
  const cursorCls = `term-cursor ${focused ? (typing ? '' : 'term-cursor-blink') : 'term-cursor-idle'}`;
  const cmdCut = input.indexOf(' ') === -1 ? input.length : input.indexOf(' ');
  const cmdCls = commandClass(input.slice(0, cmdCut));

  const lightBtn = 'w-3 h-3 rounded-full flex items-center justify-center transition-[filter] active:brightness-75';

  return (
    <motion.div ref={backdropRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-ctp-crust/75 backdrop-blur-sm" onClick={onClose}>
      <motion.div animate={shake}>
        <motion.div
          drag={!maximized}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragConstraints={backdropRef}
          dragElastic={0.06}
          style={{ x: dragX, y: dragY }}
          initial={{ scale: 0.9, opacity: 0, width, height }}
          animate={{ scale: 1, opacity: 1, width, height }}
          exit={{ scale: 0.92, opacity: 0, transition: { duration: 0.16 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-ctp-base/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border flex flex-col transition-colors duration-300 ${errFlash ? 'border-red-500/60 shadow-[0_0_40px_rgb(243_139_168/0.15)]' : 'border-zinc-700/50'}`}
        >
          {/* title bar — drag to move, double-click to maximise */}
          <div
            onPointerDown={(e) => !maximized && dragControls.start(e)}
            onDoubleClick={toggleMaximize}
            className={`bg-ctp-mantle px-4 h-11 shrink-0 flex items-center gap-2 border-b border-zinc-800 select-none touch-none ${maximized ? '' : 'cursor-grab active:cursor-grabbing'}`}
          >
            <div className="flex gap-2 group/lights" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
              <button onClick={onClose} className={`${lightBtn} bg-red-400`} aria-label="close terminal">
                <X className="w-2 h-2 text-ctp-crust/60 opacity-0 group-hover/lights:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button onClick={() => setMinimized((m) => !m)} className={`${lightBtn} bg-yellow-400`} aria-label={minimized ? 'restore terminal' : 'minimise terminal'}>
                <Minus className="w-2 h-2 text-ctp-crust/60 opacity-0 group-hover/lights:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button onClick={toggleMaximize} className={`${lightBtn} bg-green-400`} aria-label={maximized ? 'restore size' : 'maximise terminal'}>
                {maximized ? (
                  <Minimize2 className="w-2 h-2 text-ctp-crust/60 opacity-0 group-hover/lights:opacity-100 transition-opacity" strokeWidth={3} />
                ) : (
                  <Maximize2 className="w-2 h-2 text-ctp-crust/60 opacity-0 group-hover/lights:opacity-100 transition-opacity" strokeWidth={3} />
                )}
              </button>
            </div>
            <div className="flex-1 text-center text-xs text-zinc-400 font-sans -ml-14 truncate overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={lastCmd ?? 'vsh'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} className="inline-block">
                  viraj@portfolio: ~ — {lastCmd ?? 'vsh'}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          <div
            ref={bodyRef}
            className="p-4 font-mono text-sm flex-1 min-h-0 overflow-y-auto whitespace-pre-wrap leading-relaxed"
            onMouseUp={() => {
              if (!window.getSelection()?.toString()) inputRef.current?.focus();
            }}
          >
            {lines.map((l) => (
              <div key={l.id}>
                {l.kind === 'node' ? (
                  l.node
                ) : l.kind === 'in' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 text-zinc-100">
                    <PromptGlyph ok={l.ok ?? true} />
                    <span className="break-all"><HighlightedCommand text={l.text ?? ''} /></span>
                  </motion.div>
                ) : (
                  <TermText text={l.text ?? ''} kind={l.kind} />
                )}
              </div>
            ))}

            <div className="flex items-start gap-2 mt-1">
              <PromptGlyph ok={lastOk} pop />
              <div className="relative flex-1 min-w-0 break-all">
                <span aria-hidden>
                  {input.split('').map((ch, i) =>
                    i === caret && focused ? (
                      <span key={i} className={cursorCls}>{ch}</span>
                    ) : (
                      <span key={i} className={i < cmdCut ? cmdCls : 'text-teal-200'}>{ch}</span>
                    )
                  )}
                  {caret >= input.length && (
                    <>
                      <span className={cursorCls}>{ghost ? ghost[0] : ' '}</span>
                      {ghost.length > 1 && <span className="text-zinc-600">{ghost.slice(1)}</span>}
                    </>
                  )}
                  {!input && !focused && <span className="text-zinc-600"> click to type…</span>}
                </span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setCaret(e.target.selectionStart ?? e.target.value.length);
                    markTyping();
                  }}
                  onKeyDown={onKeyDown}
                  onSelect={syncCaret}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  readOnly={autoTyping}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text font-mono text-sm"
                  aria-label="terminal input"
                  autoFocus
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="px-3 py-2 border-t border-zinc-800 flex items-center gap-3 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
              {QUICK_COMMANDS.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => autoType(c)}
                  disabled={autoTyping}
                  className="shrink-0 font-mono text-[11px] px-2 py-1 rounded border border-zinc-700/70 text-zinc-400 hover:text-accent-300 hover:border-accent-500/50 hover:bg-accent-500/5 disabled:opacity-40 transition-colors"
                >
                  {c}
                </motion.button>
              ))}
            </div>
            <div className="hidden md:flex text-[11px] font-mono text-zinc-600 gap-3 shrink-0">
              <span>tab complete</span>
              <span>↑↓ history</span>
              <span>esc close</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== small hooks + bits ============================== */

// `route` entries are pages, the rest are sections on the home page
const NAV: { id: string; label: string; route?: string }[] = [
  { id: 'skills', label: 'SKILLS' },
  { id: 'projects', label: 'PROJECTS' },
  { id: 'education', label: 'EDUCATION' },
  { id: 'blog', label: 'BLOG', route: '/blog' },
  { id: 'contact', label: 'CONTACT' },
];
const NAV_SECTIONS = NAV.filter((n) => !n.route);
// "writing" is observed too so the pill clears there instead of sticking on EDUCATION
const NAV_IDS = [...NAV_SECTIONS.map((n) => n.id), 'writing'];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD_KEY = IS_MAC ? '⌘K' : 'Ctrl K';

const scrollToId = (id: string) => {
  if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

function useIstClock() {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-[10px] text-zinc-400 font-mono leading-none">{children}</kbd>
);

const ROLES = ['backend systems', 'AI pipelines', 'automation that ships', 'edge AI on tiny chips'];

const RoleTyper = () => {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const full = ROLES[idx];
    let t: number;
    if (!deleting && text === full) {
      t = window.setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && text === '') {
      setDeleting(false);
      setIdx((i) => (i + 1) % ROLES.length);
      return;
    } else {
      t = window.setTimeout(() => setText(full.slice(0, text.length + (deleting ? -1 : 1))), deleting ? 35 : 70);
    }
    return () => clearTimeout(t);
  }, [text, deleting, idx]);
  return (
    <div className="font-mono text-sm sm:text-base text-zinc-400 flex items-center gap-2 min-h-[1.75rem]">
      <span className="text-accent-600">&gt;&gt;</span>
      <span>I build <span className="text-accent-400">{text}</span></span>
      <span className="w-2 h-5 bg-accent-400 animate-pulse" />
    </div>
  );
};

const MARQUEE_TONES = [TONES.mauve.text, TONES.blue.text, TONES.green.text, TONES.peach.text, TONES.pink.text, TONES.sky.text];

const TechMarquee = () => {
  const items = skills.filter((s) => s.category !== 'Interests').flatMap((s) => s.items);
  return (
    <div className="border-y border-zinc-800/60 bg-ctp-base py-3 overflow-hidden marquee-mask" aria-hidden>
      <div className="flex w-max animate-marquee font-mono text-xs text-zinc-500">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-4 px-4 whitespace-nowrap">
            {item}
            <span className={MARQUEE_TONES[i % MARQUEE_TONES.length]}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const GateTrajectory = () => {
  const data = [
    { year: '2025', rank: 8939 },
    { year: '2026', rank: 3460 },
  ];
  const max = Math.max(...data.map((d) => d.rank));
  const gain = (data[0].rank / data[data.length - 1].rank).toFixed(1);
  return (
    <div>
      <div className="text-zinc-300 mb-2 border-b border-zinc-800 pb-1 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-accent-500" /> GATE_RANK_TRAJECTORY</div>
      <div className="flex items-baseline gap-2 mt-4">
        <span className="text-5xl font-sans font-bold tracking-tighter text-zinc-100 tabular-nums">3,460</span>
        <span className="text-accent-400">AIR ’26</span>
      </div>
      <p className="text-zinc-500 mt-1">{gain}× better than 2025 · lower is better</p>
      <div className="mt-5 space-y-3">
        {data.map((d, i) => (
          <div key={d.year} title={`GATE ${d.year}: All-India Rank ${d.rank.toLocaleString('en-IN')}`} className="cursor-default">
            <div className="flex justify-between mb-1.5">
              <span>{d.year}</span>
              <span className="text-zinc-300 tabular-nums">{d.rank.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2 bg-zinc-900">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(d.rank / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
                className={`h-full rounded-r ${i === data.length - 1 ? 'bg-accent-500' : 'bg-zinc-600'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================== COMMAND PALETTE ============================== */

type PaletteAction = { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; run: () => void };

const CommandPalette = ({ actions, onClose }: { actions: PaletteAction[]; onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = React.useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return actions;
    return actions.filter((a) => {
      const hay = `${a.group} ${a.label} ${a.hint ?? ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [query, actions]);

  useEffect(() => setSel(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const run = (a: PaletteAction) => {
    onClose();
    a.run();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[sel]) {
      e.preventDefault();
      run(results[sel]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[12vh] bg-ctp-crust/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.97, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: -10 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-ctp-mantle border border-zinc-700/70 shadow-[0_0_60px_rgb(var(--accent-rgb)/0.08)] font-mono overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
          <Search className="w-4 h-4 text-accent-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section, open a project, launch a game…"
            className="flex-1 bg-transparent outline-none py-4 text-sm text-zinc-100 placeholder:text-zinc-600 caret-accent-400"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <Kbd>ESC</Kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && <div className="px-4 py-8 text-center text-sm text-zinc-500">No matches for “{query}”</div>}
          {results.map((a, i) => (
            <React.Fragment key={a.id}>
              {(i === 0 || results[i - 1].group !== a.group) && (
                <div className="px-4 pt-3 pb-1 text-[10px] tracking-widest text-zinc-600">{a.group.toUpperCase()}</div>
              )}
              <button
                data-idx={i}
                onMouseMove={() => setSel(i)}
                onClick={() => run(a)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm border-l-2 transition-colors ${sel === i ? 'bg-accent-500/10 border-accent-500 text-accent-300' : 'border-transparent text-zinc-300'}`}
              >
                <span className={sel === i ? 'text-accent-400' : 'text-zinc-600'}>{a.icon}</span>
                <span className="flex-1 truncate">{a.label}</span>
                {a.hint && <span className="text-[11px] text-zinc-600 truncate max-w-[40%]">{a.hint}</span>}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>↑/↓ navigate</span>
          <span>↵ select</span>
          <span>{MOD_KEY} toggle</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== PROJECT VIEWS ============================== */

const ProjectLinks = ({ project, size = 'w-5 h-5' }: { project: Project; size?: string }) => (
  <div className="flex gap-3 shrink-0">
    {project.liveLink && (
      <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-accent-400 transition-colors" onClick={(e) => e.stopPropagation()} title={project.liveLabel || project.liveLink}>
        <Globe className={size} />
      </a>
    )}
    {project.repo && project.repoLink && (
      <a href={project.repoLink} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-accent-400 transition-colors" onClick={(e) => e.stopPropagation()} title="Source">
        <Github className={size} />
      </a>
    )}
  </div>
);

const ProjectCard = ({ project, large, className = '', delay, onOpen }: { project: Project; large?: boolean; className?: string; delay: number; onOpen: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    onClick={onOpen}
    onMouseMove={trackSpot}
    className={`spotlight border p-6 sm:p-8 group transition-all duration-300 relative overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 border-accent-500/25 bg-gradient-to-b from-accent-950/20 to-ctp-base hover:border-accent-500/60 hover:shadow-[0_0_30px_rgb(var(--accent-rgb)/0.08)] ${className}`}
  >
    <div className="absolute top-0 right-0 px-3 py-1.5 bg-zinc-800/40 font-mono text-xs text-zinc-500 group-hover:text-accent-400 group-hover:bg-accent-950/30 transition-colors">
      MOD_{String(projects.indexOf(project) + 1).padStart(2, '0')}
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      {project.isNew && <span className="font-mono text-[11px] px-2 py-0.5 bg-accent-500 text-ctp-crust font-bold flex items-center gap-1"><Star className="w-3 h-3" /> NEW</span>}
      {project.liveLink && <span className="font-mono text-[11px] px-2 py-0.5 border border-zinc-700 text-zinc-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" /> LIVE</span>}
      {project.tags.map((t) => <span key={t} className={`font-mono text-[11px] px-2 py-0.5 ${tagTone(t).text}`}>#{t.toLowerCase()}</span>)}
    </div>
    <h3 className={`font-bold text-zinc-100 group-hover:text-accent-400 transition-colors pr-10 flex items-center gap-3 mb-3 tracking-tight ${large ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
      {project.title}
      <ArrowUpRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-accent-400 shrink-0" />
    </h3>
    <div className={`flex-grow ${large ? 'lg:grid lg:grid-cols-2 lg:gap-10' : ''}`}>
      <p className={`text-zinc-400 leading-relaxed mb-6 ${large ? 'text-base' : 'text-[15px]'}`}>{project.description}</p>
      {large && project.details && (
        <ul className="space-y-2.5 mb-6 lg:border-l lg:border-zinc-800/60 lg:pl-8">
          {project.details.map((d) => (
            <li key={d} className="flex gap-3 text-sm text-zinc-400"><span className="text-accent-500 font-mono">▸</span><span>{d}</span></li>
          ))}
        </ul>
      )}
    </div>
    <div className="flex items-center justify-between mt-auto pt-5 border-t border-zinc-800/50 gap-3">
      <div className="flex flex-wrap gap-1.5">
        {project.tech.slice(0, large ? 6 : 3).map((tech) => (
          <span key={tech} className="font-mono text-[11px] bg-zinc-950 px-2 py-1 border border-zinc-800/80 text-zinc-400">{tech}</span>
        ))}
        {project.tech.length > (large ? 6 : 3) && <span className="font-mono text-[11px] px-2 py-1 text-zinc-600">+{project.tech.length - (large ? 6 : 3)}</span>}
      </div>
      <ProjectLinks project={project} />
    </div>
  </motion.div>
);

const ArchiveRow = ({ project, onOpen }: { project: Project; onOpen: () => void }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    className="grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[3rem_1.3fr_1fr_4rem] gap-4 items-center px-4 sm:px-6 py-4 cursor-pointer hover:bg-zinc-900/60 focus-visible:bg-zinc-900/60 outline-none transition-colors group"
  >
    <span className="font-mono text-xs text-zinc-600 group-hover:text-accent-500 transition-colors">{String(projects.indexOf(project) + 1).padStart(2, '0')}</span>
    <div className="min-w-0">
      <div className="font-semibold text-zinc-200 group-hover:text-accent-400 transition-colors truncate">{project.title}</div>
      <div className="text-sm text-zinc-500 truncate">{project.description}</div>
    </div>
    <div className="hidden md:flex flex-wrap gap-1.5">
      {project.tech.slice(0, 3).map((t) => (
        <span key={t} className="font-mono text-[11px] px-2 py-0.5 border border-zinc-800 text-zinc-500">{t}</span>
      ))}
    </div>
    <div className="flex justify-end">
      {project.repoLink || project.liveLink ? <ProjectLinks project={project} size="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4 text-zinc-700 group-hover:text-accent-400 transition-colors" />}
    </div>
  </div>
);

const NotFound = ({ path }: { path: string }) => (
  <main className="p-6 md:p-8 pt-14 min-h-[70vh]">
    <div className="border border-red-500/30 bg-ctp-base p-8 sm:p-10 font-mono text-sm max-w-2xl">
      <p className="text-zinc-400">
        <span className="text-red-400">➜</span> <span className="text-cyan-400">~</span> cd {path}
      </p>
      <p className="text-red-400 mt-2">vsh: 404: {path}: No such file or directory</p>
      <div className="flex flex-wrap gap-3 mt-8">
        <Link to="/" className="inline-flex items-center gap-2 border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-accent-500/60 hover:text-accent-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> cd ~
        </Link>
        <Link to="/blog" className="inline-flex items-center gap-2 border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-accent-500/60 hover:text-accent-400 transition-colors">
          <PenLine className="w-4 h-4" /> cd ~/blog
        </Link>
      </div>
    </div>
  </main>
);

/* ============================== APP ============================== */

export default function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [arcadeMode, setArcadeMode] = useState(false);
  const [arcadeInitial, setArcadeInitial] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sysClicks, setSysClicks] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const route = matchRoute(usePath());
  const posts = usePosts();
  const onBlog = route.name === 'blog' || route.name === 'post';
  const istTime = useIstClock();
  const activeSection = useActiveSection(NAV_IDS, route.name);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  useMotionValueEvent(scrollY, 'change', (v) => setShowTop(v > 900));

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  useKonamiCode(() => setArcadeMode(true));

  // warm the arcade chunk once the page is idle so G / play opens instantly
  useEffect(() => {
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => loadArcade(), { timeout: 5000 }) : window.setTimeout(() => loadArcade(), 3000);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !arcadeMode) {
        e.preventDefault();
        setTerminalOpen(false);
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        if (paletteOpen) setPaletteOpen(false);
        else if (selectedProject) setSelectedProject(null);
        else if (terminalOpen) setTerminalOpen(false);
      }
      // ` opens terminal, / opens palette, g opens arcade (when not typing)
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (typing || arcadeMode) return;
      if (e.key === '`') {
        e.preventDefault(); // otherwise the backtick lands in the freshly focused terminal input
        setTerminalOpen((v) => !v);
      }
      if (e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'g' || e.key === 'G') {
        setArcadeInitial(null);
        setArcadeMode(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, terminalOpen, arcadeMode, paletteOpen]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      showToast(`Copied ${PROFILE.email}`);
    } catch {
      window.location.href = `mailto:${PROFILE.email}`;
    }
  }, [showToast]);

  const openArcade = useCallback((game?: string | null) => {
    setTerminalOpen(false);
    setArcadeInitial(game ?? null);
    setArcadeMode(true);
  }, []);

  const isHome = route.name === 'home';
  const paletteActions = React.useMemo<PaletteAction[]>(() => {
    const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
    // home sections scroll in place; from a blog page they navigate home first
    const goSection = (id: string) => (isHome ? scrollToId(id) : navigate(id === 'top' ? '/' : `/#${id}`));
    return [
      { id: 'nav-top', group: 'Navigate', label: 'Home', icon: <Hash className="w-4 h-4" />, run: () => goSection('top') },
      ...NAV_SECTIONS.map((n) => ({ id: `nav-${n.id}`, group: 'Navigate', label: n.label.charAt(0) + n.label.slice(1).toLowerCase(), icon: <Hash className="w-4 h-4" />, run: () => goSection(n.id) })),
      { id: 'nav-blog', group: 'Navigate', label: 'Blog', hint: '/blog', icon: <PenLine className="w-4 h-4" />, run: () => navigate('/blog') },
      ...(posts ?? []).map((p) => ({ id: `post-${p.slug}`, group: 'Blog', label: p.title, hint: formatDate(p.date), icon: <PenLine className="w-4 h-4" />, run: () => navigate(`/blog/${p.slug}`) })),
      ...projects.map((p, i) => ({ id: `proj-${i}`, group: 'Projects', label: p.title, hint: p.tech.slice(0, 3).join(' · '), icon: <Code2 className="w-4 h-4" />, run: () => setSelectedProject(p) })),
      { id: 'act-copy', group: 'Actions', label: 'Copy email address', hint: PROFILE.email, icon: <Copy className="w-4 h-4" />, run: copyEmail },
      { id: 'act-mail', group: 'Actions', label: 'Send an email', icon: <Mail className="w-4 h-4" />, run: () => { window.location.href = `mailto:${PROFILE.email}`; } },
      { id: 'act-term', group: 'Actions', label: 'Open interactive terminal', hint: '`', icon: <TerminalIcon className="w-4 h-4" />, run: () => setTerminalOpen(true) },
      { id: 'act-theme', group: 'Actions', label: `Switch to ${isDark ? 'light' : 'dark'} theme`, icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, run: () => setIsDark((v) => !v) },
      { id: 'link-gh', group: 'Links', label: 'GitHub', hint: 'VirajAnand-02', icon: <Github className="w-4 h-4" />, run: () => open(PROFILE.github) },
      { id: 'link-li', group: 'Links', label: 'LinkedIn', hint: 'viraj-anand', icon: <Linkedin className="w-4 h-4" />, run: () => open(PROFILE.linkedin) },
      { id: 'link-x', group: 'Links', label: 'X / Twitter', hint: '@Viraj_Anand_02', icon: <Twitter className="w-4 h-4" />, run: () => open(PROFILE.twitter) },
      { id: 'link-nb', group: 'Links', label: 'nb-make (live)', hint: 'nb-make.vrj02.dev', icon: <Globe className="w-4 h-4" />, run: () => open('https://nb-make.vrj02.dev') },
      { id: 'game-arcade', group: 'Arcade', label: 'Open arcade', hint: 'G', icon: <Play className="w-4 h-4" />, run: () => openArcade(null) },
      ...CATALOG.map((g) => ({ id: `game-${g.id}`, group: 'Arcade', label: `Play ${g.title.toLowerCase()}`, icon: <Play className="w-4 h-4" />, run: () => openArcade(g.id) })),
    ];
  }, [isDark, copyEmail, openArcade, posts, isHome]);

  const filtered = filter === 'All' ? projects : projects.filter((p) => p.tags.includes(filter));
  const featuredVisible = filtered.filter((p) => p.featured);
  const archiveVisible = filtered.filter((p) => !p.featured);
  const compromised = sysClicks >= 5;

  // featured grid: lead card goes full-width (with details) unless exactly two cards share the row
  const isLead = (i: number) => i === 0 && featuredVisible.length !== 2;

  useEffect(() => {
    if (compromised) setTerminalOpen(true);
  }, [compromised]);

  const ctaBase = 'flex items-center gap-2 border px-4 py-2.5 transition-all hover:-translate-y-0.5';
  const iconBtn = 'p-2.5 border border-zinc-700/50 bg-zinc-900/50 hover:bg-accent-500/10 hover:border-accent-500/50 hover:text-accent-400 transition-all hover:-translate-y-0.5';

  return (
    <div className="min-h-screen text-zinc-300 font-sans selection:bg-ctp-mauve/30 selection:text-ctp-rosewater relative">
      {/* slow rotating grid behind the dot pattern */}
      <div className="backdrop-layer backdrop-grid" aria-hidden />
      <div className="backdrop-layer backdrop-diagonals" aria-hidden />

      <Suspense fallback={null}>
        <AnimatePresence>{arcadeMode && <ArcadeMode initialGame={arcadeInitial} onClose={() => { setArcadeMode(false); setArcadeInitial(null); }} />}</AnimatePresence>
      </Suspense>

      {/* scroll progress */}
      <motion.div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-ctp-green via-ctp-sky to-ctp-mauve z-[60] origin-left" style={{ scaleX: progress }} />

      <div className="max-w-7xl mx-auto border-x border-zinc-800/60 min-h-screen relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-zinc-800/60 px-4 sm:px-6 h-14 flex justify-between items-center font-mono text-sm text-zinc-500 gap-3 bg-ctp-base/85 backdrop-blur-md">
          <div className="flex items-center gap-4 min-w-0">
            <span
              className={`font-bold cursor-pointer select-none transition-colors whitespace-nowrap ${compromised ? 'text-red-500 animate-pulse' : 'text-accent-500'}`}
              onClick={() => setSysClicks((c) => c + 1)}
              title="Click me 5 times..."
            >
              {compromised ? 'ROOT_ACCESS_GRANTED' : 'SYS.ID: VA-02'}
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs whitespace-nowrap" title="Local time in Kalyani">
              <Clock className="w-3.5 h-3.5" /> KALYANI {istTime} IST
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            {NAV.map((n) => ({ key: n.id, to: n.route ?? `/#${n.id}`, label: n.label, active: n.route ? onBlog : isHome && activeSection === n.id })).map((n) => (
              <Link
                key={n.key}
                to={n.to}
                className={`relative px-3 py-1.5 transition-colors ${n.active ? 'text-accent-300' : 'hover:text-zinc-200'}`}
              >
                {n.active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 bg-accent-500/10 border border-accent-500/30" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                )}
                <span className="relative">// {n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden xl:flex items-center gap-2 mr-2 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${compromised ? 'bg-red-400' : 'bg-accent-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${compromised ? 'bg-red-500' : 'bg-accent-500'}`}></span>
              </span>
              {compromised ? 'OVERRIDE' : 'ONLINE'}
            </span>
            <button onClick={() => setPaletteOpen(true)} className="flex items-center gap-2 px-2.5 py-1.5 border border-zinc-800/60 bg-zinc-900/50 hover:border-accent-500/40 hover:text-accent-400 transition-colors text-xs" title={`Command palette (${MOD_KEY})`}>
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
              <span className="hidden sm:inline"><Kbd>{MOD_KEY}</Kbd></span>
            </button>
            <button onClick={() => setTerminalOpen(true)} className="p-1.5 border border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-800/80 hover:text-accent-400 transition-colors" title="Open terminal (`)">
              <TerminalIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setIsDark(!isDark)} className="p-1.5 border border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-800/80 hover:text-accent-400 transition-colors" title="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {route.name === 'blog' && <BlogIndex />}
        {route.name === 'post' && <BlogPost slug={route.slug} onToast={showToast} />}
        {route.name === 'notfound' && <NotFound path={route.path} />}

        {isHome && (<>
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-3 border-b border-zinc-800/60">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-ctp-base p-6 sm:p-10 relative overflow-hidden lg:border-r border-zinc-800/60">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-ctp-mauve/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start relative">
              <ProfilePhoto />
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 border border-accent-500/40 bg-accent-950/40 text-accent-300"><span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" /> OPEN TO WORK</span>
                  <span className="px-2.5 py-1 border border-zinc-700 text-zinc-400 flex items-center gap-1"><Zap className="w-3 h-3" /> GATE AIR 3460</span>
                  <span className="px-2.5 py-1 border border-zinc-700 text-zinc-400">{PROFILE.role}</span>
                </div>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-zinc-100 uppercase leading-[0.9]">
                  Viraj<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-ctp-green via-ctp-teal to-ctp-sky">Anand</span>
                </h1>
                <RoleTyper />
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed max-w-2xl text-[15px] mt-8 relative">{PROFILE.summary}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-zinc-500 mt-4 relative">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {PROFILE.location}</span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Univ. of Kalyani · CGPA 8.4</span>
            </div>
            <div className="flex flex-wrap gap-3 font-mono text-sm pt-8 relative">
              <a href="#projects" className={`${ctaBase} border-accent-500/60 bg-accent-500 text-ctp-crust font-bold hover:bg-accent-400`}>
                VIEW PROJECTS <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={copyEmail} className={`${ctaBase} border-zinc-700/50 bg-zinc-900/50 hover:bg-accent-500/10 hover:border-accent-500/50 hover:text-accent-400`}>
                <Copy className="w-4 h-4" /> COPY EMAIL
              </button>
              <div className="flex gap-2">
                <a href={PROFILE.github} target="_blank" rel="noreferrer" className={iconBtn} aria-label="GitHub" title="GitHub"><Github className="w-4 h-4" /></a>
                <a href={PROFILE.linkedin} target="_blank" rel="noreferrer" className={iconBtn} aria-label="LinkedIn" title="LinkedIn"><Linkedin className="w-4 h-4" /></a>
                <a href={PROFILE.twitter} target="_blank" rel="noreferrer" className={iconBtn} aria-label="X / Twitter" title="X / Twitter"><Twitter className="w-4 h-4" /></a>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-ctp-base p-6 sm:p-8 font-mono text-xs text-zinc-500 flex flex-col gap-8 border-t lg:border-t-0 border-zinc-800/60">
            <GateTrajectory />
            <div>
              <div className="text-zinc-300 mb-2 border-b border-zinc-800 pb-1">SYS_SPECS</div>
              <div className="grid grid-cols-2 gap-y-2 mt-3">
                <span>DEGREE</span> <span className="text-zinc-300 text-right">B.TECH CSE</span>
                <span>CLASS OF</span> <span className="text-zinc-300 text-right">2026</span>
                <span>CGPA</span> <span className="text-zinc-300 text-right">8.4 / 10</span>
                <span>MODULES</span> <span className="text-zinc-300 text-right">{projects.length} SHIPPED</span>
              </div>
            </div>
            <div className="mt-auto">
              <div className="text-zinc-300 mb-2 border-b border-zinc-800 pb-1">COMPUTE_TARGETS</div>
              <div className="mt-3 text-zinc-400 leading-relaxed">ESP32 · RPI · ARDUINO · CLOUD RUN · LINUX · DOCKER</div>
            </div>
          </motion.div>
        </section>

        <TechMarquee />

        <main className="p-6 md:p-8 space-y-20 pt-14">
          {/* Skills */}
          <section id="skills" className="scroll-mt-24">
            <SectionHeading index="01" label="// SKILLS_MATRIX" right={`${skills.length} CATEGORIES · ${skills.reduce((n, s) => n + s.items.length, 0)} ENTRIES`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-zinc-800/60">
              {skills.map((skill, idx) => (
                <motion.div
                  key={skill.category}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.04 }}
                  onMouseMove={trackSpot}
                  className="spotlight border-b border-r border-zinc-800/60 p-6 bg-ctp-base hover:bg-zinc-900/60 transition-colors duration-300 group flex flex-col z-10"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-zinc-200 font-semibold flex items-center gap-3 text-lg">
                      <span className={skill.tone.text}>{skill.icon}</span>
                      {skill.category}
                    </div>
                    <span className="font-mono text-[11px] text-zinc-700 group-hover:text-accent-600 transition-colors">{String(idx + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {skill.items.map((item) => (
                      <span key={item} className={`px-3 py-1.5 text-xs font-mono rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 ${skill.tone.chip} transition-colors`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Projects */}
          <section id="projects" className="scroll-mt-24">
            <SectionHeading index="02" label="// DEPLOYED_MODULES" right={`${projects.length} MODULES`} />
            <div className="flex flex-wrap items-center gap-2 mb-6 font-mono text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 border transition-all ${filter === f ? 'border-accent-500 text-accent-300 bg-accent-950/40' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                >
                  {f !== 'All' && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${tagTone(f).dot}`} />}{f.toUpperCase()} {f !== 'All' && <span className="opacity-50">·{projects.filter((p) => p.tags.includes(f)).length}</span>}
                </button>
              ))}
            </div>

            {featuredVisible.length > 0 && (
              <div key={`featured-${filter}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredVisible.map((project, idx) => (
                  <React.Fragment key={project.title}>
                    <ProjectCard
                      project={project}
                      large={isLead(idx)}
                      className={isLead(idx) ? 'md:col-span-2' : ''}
                      delay={idx * 0.06}
                      onOpen={() => setSelectedProject(project)}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}

            {archiveVisible.length > 0 && (
              <div key={`archive-${filter}`} className={featuredVisible.length > 0 ? 'mt-10' : ''}>
                <div className="font-mono text-xs text-zinc-500 mb-3 flex items-center gap-3">
                  <span className="tracking-widest">OTHER PROJECTS</span>
                  <span className="flex-1 h-px bg-zinc-800/60" />
                  <span className="text-zinc-600">{archiveVisible.length} {archiveVisible.length === 1 ? 'ENTRY' : 'ENTRIES'}</span>
                </div>
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border border-zinc-800/60 bg-ctp-base divide-y divide-zinc-800/60">
                  <div className="hidden md:grid grid-cols-[3rem_1.3fr_1fr_4rem] gap-4 px-6 py-2.5 font-mono text-[10px] tracking-widest text-zinc-600">
                    <span>#</span><span>PROJECT</span><span>STACK</span><span className="text-right">LINKS</span>
                  </div>
                  {archiveVisible.map((project) => (
                    <React.Fragment key={project.title}><ArchiveRow project={project} onOpen={() => setSelectedProject(project)} /></React.Fragment>
                  ))}
                </motion.div>
              </div>
            )}
          </section>

          {/* Education & Certs */}
          <section id="education" className="scroll-mt-24 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col">
              <SectionHeading index="03" label="// EDUCATION_LOG" />
              <div className="border border-zinc-800/60 bg-ctp-base p-8 space-y-8 flex-1">
                {education.map((edu) => (
                  <div key={edu.degree} className="relative pl-6 border-l-2 border-zinc-800 group">
                    <div className="absolute w-3 h-3 bg-zinc-800 -left-[7px] top-1.5 group-hover:bg-accent-500 transition-colors duration-300" />
                    <div className="font-mono text-xs text-accent-400 mb-2">{edu.date}</div>
                    <h3 className="text-base font-bold text-zinc-200">{edu.degree}</h3>
                    <p className="text-sm text-zinc-400 mt-2">{edu.institution}</p>
                    <p className="text-xs font-mono text-zinc-500 mt-3">{edu.details}</p>
                    {edu.highlight && <span className="inline-block mt-3 font-mono text-[11px] px-2 py-1 bg-accent-950/50 border border-accent-500/40 text-accent-300"><Award className="w-3 h-3 inline mr-1" />{edu.highlight}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <SectionHeading index="04" label="// CERTIFICATIONS" />
              <div className="border border-zinc-800/60 bg-ctp-base p-8 space-y-6 flex-1">
                {certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-start gap-4 group">
                    <span className="font-mono text-zinc-600 group-hover:text-accent-500 transition-colors mt-0.5"><ChevronRight className="w-4 h-4" /></span>
                    <p className="text-[15px] text-zinc-300 leading-relaxed group-hover:text-zinc-100 transition-colors">{cert}</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-zinc-800/60">
                  <p className="font-mono text-xs text-zinc-500 mb-3">ACHIEVEMENTS</p>
                  <div className="flex items-start gap-4 group">
                    <span className="font-mono text-zinc-600 group-hover:text-accent-500 transition-colors mt-0.5"><Trophy className="w-4 h-4" /></span>
                    <p className="text-[15px] text-zinc-300 leading-relaxed">GATE 2026 — All-India Rank 3460 (up from 8939 in 2025)</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Writing */}
          {posts && posts.length > 0 && (
            <section id="writing" className="scroll-mt-24">
              <SectionHeading index="05" label="// WRITING" right={`${posts.length} ${posts.length === 1 ? 'POST' : 'POSTS'}`} />
              <div className={`grid grid-cols-1 gap-4 ${posts.length >= 3 ? 'md:grid-cols-3' : posts.length === 2 ? 'md:grid-cols-2' : 'max-w-xl'}`}>
                {posts.slice(0, 3).map((post, idx) => (
                  <motion.div
                    key={post.slug}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                    onMouseMove={trackSpot}
                    className="spotlight relative overflow-hidden"
                  >
                    <Link to={`/blog/${post.slug}`} className="h-full flex flex-col border border-zinc-800/60 bg-ctp-base p-6 hover:border-accent-500/50 hover:-translate-y-1 transition-all group">
                      <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500">
                        <time dateTime={post.date} className="text-accent-400">{formatDate(post.date)}</time>
                        <span>{post.readingMinutes} min read</span>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight text-zinc-100 group-hover:text-accent-400 transition-colors mt-4">{post.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed mt-3 flex-grow line-clamp-3">{post.description}</p>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800/50 font-mono text-[11px]">
                        <span className="text-zinc-600 truncate">{post.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}</span>
                        <span className="flex items-center gap-1 text-zinc-500 group-hover:text-accent-400 transition-colors shrink-0">READ <ArrowUpRight className="w-3.5 h-3.5" /></span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-center md:justify-end mt-6">
                <Link to="/blog" className="flex items-center gap-2 font-mono text-xs border border-zinc-700 px-4 py-2 text-zinc-400 hover:border-accent-500/60 hover:text-accent-300 transition-colors">
                  ALL POSTS <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          )}

          {/* Contact */}
          <section id="contact" className="scroll-mt-24">
            <SectionHeading index={posts && posts.length > 0 ? '06' : '05'} label="// OPEN_CHANNEL" right={`KALYANI · ${istTime} IST`} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-ctp-mauve/30 bg-gradient-to-br from-ctp-mauve/10 via-ctp-base to-ctp-base p-6 sm:p-12 relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[linear-gradient(to_right,var(--color-accent-500)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-accent-500)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-end relative">
                <div>
                  <p className="font-mono text-xs text-accent-400 mb-5">&gt; status: open to entry-level Backend &amp; AI roles</p>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-zinc-100 leading-[1]">
                    Let’s build something<br />that <span className="text-accent-400">ships.</span>
                  </h2>
                  <p className="text-zinc-400 max-w-xl mt-6 leading-relaxed">
                    APIs, data pipelines, automation and AI systems — if you’re hiring or have something interesting to build, drop me a line.
                  </p>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <button onClick={copyEmail} className="w-full flex items-center justify-between gap-3 border border-zinc-700/70 bg-ctp-crust/40 px-5 py-4 hover:border-accent-500/60 transition-colors group" title="Copy email">
                    <span className="text-zinc-200 truncate">{PROFILE.email}</span>
                    <Copy className="w-4 h-4 text-zinc-500 group-hover:text-accent-400 shrink-0" />
                  </button>
                  <a href={`mailto:${PROFILE.email}`} className="w-full flex items-center justify-center gap-2 bg-accent-500 text-ctp-crust font-bold px-5 py-4 hover:bg-accent-400 transition-colors">
                    SEND AN EMAIL <Send className="w-4 h-4" />
                  </a>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'GITHUB', href: PROFILE.github },
                      { label: 'LINKEDIN', href: PROFILE.linkedin },
                      { label: 'X', href: PROFILE.twitter },
                    ].map((l) => (
                      <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between border border-zinc-800 px-3 py-3 text-xs text-zinc-400 hover:border-accent-500/50 hover:text-accent-400 transition-colors">
                        {l.label} <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </main>
        </>)}

        {/* Footer */}
        <footer className="border-t border-zinc-800/60 p-8 flex flex-col items-center gap-6 font-mono text-xs text-zinc-500 bg-ctp-base">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-zinc-600">
            <span className="flex items-center gap-2"><Kbd>{MOD_KEY}</Kbd> command palette</span>
            <span className="flex items-center gap-2"><Kbd>`</Kbd> terminal</span>
            <span className="flex items-center gap-2"><Kbd>G</Kbd> arcade</span>
          </div>
          <KonamiHint />
          <div className="cursor-pointer select-none text-center" onClick={() => setSysClicks((c) => c + 1)}>
            © {new Date().getFullYear()} VIRAJ ANAND // {compromised ? 'SYSTEM COMPROMISED — nice, you found it' : 'ALL SYSTEMS NOMINAL'}
          </div>
        </footer>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showTop && !arcadeMode && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToId('top')}
            className="fixed bottom-6 right-6 z-40 p-3 border border-zinc-700 bg-ctp-base/90 backdrop-blur text-zinc-400 hover:text-accent-400 hover:border-accent-500/60 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className="fixed inset-x-0 bottom-6 z-[70] flex justify-center pointer-events-none px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="flex items-center gap-2 border border-accent-500/50 bg-ctp-base px-4 py-2.5 font-mono text-xs text-accent-300 shadow-[0_0_30px_rgb(var(--accent-rgb)/0.15)]"
            >
              <Check className="w-4 h-4" /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Project Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ctp-crust/80 backdrop-blur-sm" onClick={() => setSelectedProject(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-ctp-base border border-zinc-800/60 p-8 sm:p-10 max-w-3xl w-full relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setSelectedProject(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-accent-400 transition-colors p-2" aria-label="close">
                <X className="w-6 h-6" />
              </button>
              <div className="font-mono text-sm text-accent-500 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-accent-500 inline-block"></span>
                // PROJECT_DETAILS
                {selectedProject.isNew && <span className="px-2 py-0.5 bg-accent-500 text-ctp-crust text-[11px] font-bold">NEW</span>}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-6 pr-8">{selectedProject.title}</h2>
              <div className="flex flex-wrap gap-2 mb-8">
                {selectedProject.tech.map((tech) => (
                  <span key={tech} className="font-mono text-sm bg-zinc-950 px-3 py-1.5 border border-zinc-800/80 text-accent-400">{tech}</span>
                ))}
              </div>
              <div className="text-zinc-400 text-[15px] leading-relaxed space-y-4 mb-8">
                <p>{selectedProject.description}</p>
                {selectedProject.details && (
                  <ul className="space-y-2 pt-2">
                    {selectedProject.details.map((d) => (
                      <li key={d} className="flex gap-2"><span className="text-accent-500 font-mono">▸</span><span>{d}</span></li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedProject.tags.map((t) => (
                    <span key={t} className={`font-mono text-[11px] px-2 py-1 border ${tagTone(t).tag}`}>#{t}</span>
                  ))}
                </div>
              </div>
              <div className="mt-auto pt-8 border-t border-zinc-800/50 flex flex-wrap justify-end gap-3">
                {selectedProject.liveLink && (
                  <a href={selectedProject.liveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-mono text-sm border border-accent-500/50 bg-accent-950/40 px-5 py-2.5 text-accent-300 hover:bg-accent-500/20 transition-colors">
                    <Globe className="w-5 h-5" /> {selectedProject.liveLabel || 'LIVE DEMO'}
                  </a>
                )}
                {selectedProject.repo && selectedProject.repoLink ? (
                  <a href={selectedProject.repoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-mono text-sm border border-zinc-700/50 bg-zinc-900/50 px-5 py-2.5 hover:bg-accent-500/10 hover:border-accent-500/50 hover:text-accent-400 transition-colors">
                    <Github className="w-5 h-5" /> VIEW_SOURCE
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 font-mono text-sm border border-zinc-800/50 bg-zinc-950/50 px-5 py-2.5 text-zinc-600 cursor-not-allowed">
                    <Code2 className="w-5 h-5" /> PROPRIETARY_CODE
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command palette */}
      <AnimatePresence>
        {paletteOpen && <CommandPalette actions={paletteActions} onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>

      {/* Terminal */}
      <AnimatePresence>
        {terminalOpen && (
          <TerminalOverlay
            onClose={() => { setTerminalOpen(false); setSysClicks(0); }}
            onLaunchArcade={openArcade}
            onToggleTheme={() => setIsDark((v) => !v)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
