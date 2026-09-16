import React, { useEffect, useState } from 'react';

/* Small pieces shared by the home page (App.tsx) and the blog pages. */

// Catppuccin Mocha hues as ready-made class sets (spelled out in full so Tailwind can find them)
export const TONES = {
  mauve: { text: 'text-ctp-mauve', chip: 'group-hover:border-ctp-mauve/40 group-hover:text-ctp-mauve', tag: 'text-ctp-mauve border-ctp-mauve/30 bg-ctp-mauve/10', dot: 'bg-ctp-mauve' },
  blue: { text: 'text-ctp-blue', chip: 'group-hover:border-ctp-blue/40 group-hover:text-ctp-blue', tag: 'text-ctp-blue border-ctp-blue/30 bg-ctp-blue/10', dot: 'bg-ctp-blue' },
  sky: { text: 'text-ctp-sky', chip: 'group-hover:border-ctp-sky/40 group-hover:text-ctp-sky', tag: 'text-ctp-sky border-ctp-sky/30 bg-ctp-sky/10', dot: 'bg-ctp-sky' },
  sapphire: { text: 'text-ctp-sapphire', chip: 'group-hover:border-ctp-sapphire/40 group-hover:text-ctp-sapphire', tag: 'text-ctp-sapphire border-ctp-sapphire/30 bg-ctp-sapphire/10', dot: 'bg-ctp-sapphire' },
  teal: { text: 'text-ctp-teal', chip: 'group-hover:border-ctp-teal/40 group-hover:text-ctp-teal', tag: 'text-ctp-teal border-ctp-teal/30 bg-ctp-teal/10', dot: 'bg-ctp-teal' },
  green: { text: 'text-ctp-green', chip: 'group-hover:border-ctp-green/40 group-hover:text-ctp-green', tag: 'text-ctp-green border-ctp-green/30 bg-ctp-green/10', dot: 'bg-ctp-green' },
  yellow: { text: 'text-ctp-yellow', chip: 'group-hover:border-ctp-yellow/40 group-hover:text-ctp-yellow', tag: 'text-ctp-yellow border-ctp-yellow/30 bg-ctp-yellow/10', dot: 'bg-ctp-yellow' },
  peach: { text: 'text-ctp-peach', chip: 'group-hover:border-ctp-peach/40 group-hover:text-ctp-peach', tag: 'text-ctp-peach border-ctp-peach/30 bg-ctp-peach/10', dot: 'bg-ctp-peach' },
  pink: { text: 'text-ctp-pink', chip: 'group-hover:border-ctp-pink/40 group-hover:text-ctp-pink', tag: 'text-ctp-pink border-ctp-pink/30 bg-ctp-pink/10', dot: 'bg-ctp-pink' },
  maroon: { text: 'text-ctp-maroon', chip: 'group-hover:border-ctp-maroon/40 group-hover:text-ctp-maroon', tag: 'text-ctp-maroon border-ctp-maroon/30 bg-ctp-maroon/10', dot: 'bg-ctp-maroon' },
} as const;
export type Tone = (typeof TONES)[keyof typeof TONES];

const KNOWN_TAGS: Record<string, Tone> = {
  ai: TONES.mauve,
  backend: TONES.blue,
  web: TONES.sky,
  embedded: TONES.peach,
  automation: TONES.yellow,
};
const TAG_ROTATION = [TONES.mauve, TONES.blue, TONES.peach, TONES.teal, TONES.pink, TONES.yellow, TONES.sapphire, TONES.maroon];

/** Stable colour per tag: known project tags are fixed, anything else hashes into the rotation. */
export function tagTone(tag: string): Tone {
  const key = tag.toLowerCase();
  if (KNOWN_TAGS[key]) return KNOWN_TAGS[key];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_ROTATION[h % TAG_ROTATION.length];
}

export const SectionHeading = ({ index, label, right }: { index: string; label: string; right?: React.ReactNode }) => (
  <div className="font-mono text-sm text-zinc-500 mb-6 flex items-center gap-3">
    <span className="text-ctp-mauve">{index}</span>
    <span className="w-3 h-3 bg-zinc-700 inline-block"></span>
    <span className="tracking-widest">{label}</span>
    <span className="flex-1 h-px bg-zinc-800/60" />
    {right && <span className="text-zinc-600 text-xs hidden sm:inline">{right}</span>}
  </div>
);

// cursor-follow glow; pairs with the `.spotlight` class in index.css
export const trackSpot = (e: React.MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
};

/** Tracks which of the elements with these ids is in the reading zone. `refreshKey` re-queries the DOM. */
export function useActiveSection(ids: string[], refreshKey: unknown = null, rootMargin = '-45% 0px -50% 0px') {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    setActive(null);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids, refreshKey, rootMargin]);
  return active;
}

/** Sets the tab title + meta description while mounted, restoring the previous values afterwards. */
export function useDocumentMeta(title: string | null, description?: string | null) {
  useEffect(() => {
    if (!title) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prev = { title: document.title, description: meta?.content };
    document.title = title;
    if (meta && description) meta.content = description;
    return () => {
      document.title = prev.title;
      if (meta && prev.description !== undefined) meta.content = prev.description;
    };
  }, [title, description]);
}
