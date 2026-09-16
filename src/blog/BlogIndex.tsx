import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Filter, Rss } from 'lucide-react';
import { Link } from '../router';
import { SectionHeading, tagTone, useDocumentMeta } from '../ui';
import { formatDate, usePosts, type PostMeta } from './data';

export default function BlogIndex() {
  const posts = usePosts();
  const [tag, setTag] = useState('all');
  useDocumentMeta('Blog — Viraj Anand', 'Posts and build logs by Viraj Anand.');

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    posts?.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts]);

  const visible = (posts ?? []).filter((p) => tag === 'all' || p.tags.includes(tag));
  const byYear = visible.reduce<[string, PostMeta[]][]>((groups, p) => {
    const year = p.date.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last[0] === year) last[1].push(p);
    else groups.push([year, [p]]);
    return groups;
  }, []);

  return (
    <main className="p-6 md:p-8 pt-10 md:pt-14 min-h-[70vh]">
      <SectionHeading
        index="~/blog"
        label="// WRITING_LOG"
        right={posts ? `${posts.length} ${posts.length === 1 ? 'POST' : 'POSTS'}` : 'LOADING…'}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-zinc-100 leading-[0.95]">
            Writing<span className="text-accent-400">.</span>
          </h1>
          <p className="text-zinc-400 mt-4 max-w-xl leading-relaxed">Notes, write-ups and build logs.</p>
        </div>
        <a href="/blog/rss.xml" className="self-start md:self-auto flex items-center gap-2 font-mono text-xs border border-zinc-800 px-3 py-2 text-zinc-400 hover:text-accent-400 hover:border-accent-500/50 transition-colors">
          <Rss className="w-3.5 h-3.5" /> RSS
        </a>
      </motion.div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8 font-mono text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          {[['all', posts?.length ?? 0] as const, ...tags].map(([t, n]) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-3 py-1.5 border transition-all ${tag === t ? 'border-accent-500 text-accent-300 bg-accent-950/40' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
            >
              {t !== 'all' && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${tagTone(t).dot}`} />}{t === 'all' ? 'ALL' : `#${t}`} <span className="opacity-50">·{n}</span>
            </button>
          ))}
        </div>
      )}

      {posts === null && (
        <div className="border border-zinc-800/60 bg-ctp-base divide-y divide-zinc-800/60">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-6 py-6 space-y-3 animate-pulse">
              <div className="h-3 w-24 bg-zinc-800" />
              <div className="h-5 w-2/3 bg-zinc-800/80" />
              <div className="h-3 w-1/2 bg-zinc-900" />
            </div>
          ))}
        </div>
      )}

      {posts?.length === 0 && (
        <div className="border border-zinc-800/60 bg-ctp-base p-10 font-mono text-sm">
          <p className="text-zinc-500">
            <span className="text-accent-400">➜</span> <span className="text-cyan-400">~/blog</span> ls
          </p>
          <p className="text-zinc-400 mt-2">total 0 — the first post is on its way.</p>
        </div>
      )}

      <div key={tag} className="space-y-10">
        {byYear.map(([year, list]) => (
          <section key={year}>
            <div className="font-mono text-xs text-zinc-500 mb-3 flex items-center gap-3">
              <span className="tracking-widest">{year}</span>
              <span className="flex-1 h-px bg-zinc-800/60" />
              <span className="text-zinc-600">{list.length}</span>
            </div>
            <div className="border border-zinc-800/60 bg-ctp-base divide-y divide-zinc-800/60">
              {list.map((post, i) => (
                <motion.div key={post.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="grid grid-cols-1 md:grid-cols-[7rem_1fr_auto] gap-2 md:gap-6 items-start px-5 sm:px-6 py-5 hover:bg-zinc-900/60 focus-visible:bg-zinc-900/60 outline-none transition-colors group"
                  >
                    <time dateTime={post.date} className="font-mono text-xs text-zinc-500 md:pt-1.5 group-hover:text-accent-500 transition-colors">
                      {formatDate(post.date, { day: '2-digit', month: 'short' })}
                    </time>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 group-hover:text-accent-400 transition-colors tracking-tight">
                        {post.title}
                        {post.draft && <span className="ml-2 align-middle font-mono text-[10px] px-1.5 py-0.5 border border-yellow-500/50 text-yellow-400">DRAFT</span>}
                      </h2>
                      <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{post.description}</p>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 font-mono text-[11px]">
                          {post.tags.map((t) => <span key={t} className={tagTone(t).text}>#{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-3 font-mono text-xs text-zinc-600 pt-1.5">
                      {post.readingMinutes} min
                      <ArrowUpRight className="w-4 h-4 group-hover:text-accent-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
