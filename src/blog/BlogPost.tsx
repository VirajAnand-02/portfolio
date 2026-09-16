import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { isPlainLeftClick, Link, navigate } from '../router';
import { tagTone, useActiveSection, useDocumentMeta } from '../ui';
import { formatDate, getPost, usePosts, type Post } from './data';

export default function BlogPost({ slug, onToast }: { slug: string; onToast: (msg: string) => void }) {
  const posts = usePosts();
  const [post, setPost] = useState<Post | null | undefined>(undefined); // undefined = loading, null = not found
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setPost(undefined);
    getPost(slug).then((p) => alive && setPost(p));
    return () => {
      alive = false;
    };
  }, [slug]);

  useDocumentMeta(post ? `${post.title} — Viraj Anand` : post === null ? 'Post not found — Viraj Anand' : null, post?.description);

  const tocIds = useMemo(() => post?.toc.map((t) => t.id) ?? [], [post]);
  const activeId = useActiveSection(tocIds, post, '-15% 0px -75% 0px');

  // copy buttons on code blocks (markup comes pre-rendered from the build)
  useEffect(() => {
    const root = articleRef.current;
    if (!root || !post) return;
    const added: HTMLButtonElement[] = [];
    root.querySelectorAll<HTMLElement>('.code-block').forEach((block) => {
      const head = block.querySelector('.code-head');
      const code = block.querySelector('pre');
      if (!head || !code) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = 'copy';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ''));
          btn.textContent = 'copied ✓';
          onToast('Code copied to clipboard');
          window.setTimeout(() => (btn.textContent = 'copy'), 1600);
        } catch {
          btn.textContent = 'failed';
        }
      });
      head.appendChild(btn);
      added.push(btn);
    });
    // honour #heading deep links once the article exists
    if (window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
    return () => added.forEach((b) => b.remove());
  }, [post, onToast]);

  // keep links between posts inside the SPA
  const onArticleClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    const href = a?.getAttribute('href');
    if (!a || !href || !href.startsWith('/') || a.target === '_blank' || !isPlainLeftClick(e)) return;
    e.preventDefault();
    navigate(href);
  };

  const idx = posts?.findIndex((p) => p.slug === slug) ?? -1;
  const newer = idx > 0 ? posts![idx - 1] : null;
  const older = idx >= 0 && posts && idx < posts.length - 1 ? posts[idx + 1] : null;

  if (post === null) {
    return (
      <main className="p-6 md:p-8 pt-14 min-h-[70vh]">
        <div className="border border-red-500/30 bg-ctp-base p-8 sm:p-10 font-mono text-sm max-w-2xl">
          <p className="text-zinc-400">
            <span className="text-red-400">➜</span> <span className="text-cyan-400">~/blog</span> cat {slug}.md
          </p>
          <p className="text-red-400 mt-2">cat: {slug}.md: No such file or directory</p>
          <Link to="/blog" className="inline-flex items-center gap-2 mt-8 border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-accent-500/60 hover:text-accent-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> cd ../blog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8 pt-8 md:pt-12 min-h-[70vh]">
      <Link to="/blog" className="inline-flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-accent-400 transition-colors group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> cd ../blog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_14rem] gap-12 mt-8">
        <article className="min-w-0 max-w-3xl">
          {post === undefined ? (
            <div className="space-y-4 animate-pulse" aria-label="Loading post">
              <div className="h-3 w-48 bg-zinc-800" />
              <div className="h-12 w-4/5 bg-zinc-800/80" />
              <div className="h-4 w-3/5 bg-zinc-900" />
              <div className="pt-8 space-y-3">
                {[92, 86, 95, 70, 88].map((w, i) => <div key={i} className="h-3 bg-zinc-900" style={{ width: `${w}%` }} />)}
              </div>
            </div>
          ) : (
            <motion.div key={post.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <header className="pb-8 mb-8 border-b border-zinc-800/60">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-zinc-500">
                  <time dateTime={post.date} className="text-accent-400">{formatDate(post.date)}</time>
                  <span className="text-zinc-700">·</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readingMinutes} min read</span>
                  {post.draft && <span className="px-1.5 py-0.5 border border-yellow-500/50 text-yellow-400 text-[10px]">DRAFT</span>}
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-zinc-100 leading-[1.05] mt-4">{post.title}</h1>
                {post.description && <p className="text-lg text-zinc-400 mt-5 leading-relaxed">{post.description}</p>}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {post.tags.map((t) => (
                      <span key={t} className={`font-mono text-[11px] px-2 py-1 border ${tagTone(t).tag}`}>#{t}</span>
                    ))}
                  </div>
                )}
              </header>

              {post.cover && <img src={post.cover} alt="" className="w-full border border-zinc-800/60 mb-10" />}

              <div ref={articleRef} className="prose-terminal" onClick={onArticleClick} dangerouslySetInnerHTML={{ __html: post.html }} />

              {(newer || older) && (
                <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-8 border-t border-zinc-800/60" aria-label="More posts">
                  {older ? (
                    <Link to={`/blog/${older.slug}`} className="border border-zinc-800/60 bg-ctp-base p-5 hover:border-accent-500/50 transition-colors group">
                      <span className="font-mono text-[11px] text-zinc-500 flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> OLDER</span>
                      <span className="block mt-2 font-semibold text-zinc-200 group-hover:text-accent-400 transition-colors">{older.title}</span>
                    </Link>
                  ) : <span className="hidden sm:block" />}
                  {newer && (
                    <Link to={`/blog/${newer.slug}`} className="border border-zinc-800/60 bg-ctp-base p-5 hover:border-accent-500/50 transition-colors group sm:text-right">
                      <span className="font-mono text-[11px] text-zinc-500 flex items-center gap-1.5 sm:justify-end">NEWER <ArrowRight className="w-3.5 h-3.5" /></span>
                      <span className="block mt-2 font-semibold text-zinc-200 group-hover:text-accent-400 transition-colors">{newer.title}</span>
                    </Link>
                  )}
                </nav>
              )}
            </motion.div>
          )}
        </article>

        {post && post.toc.length > 1 && (
          <aside className="hidden lg:block">
            <nav className="sticky top-24 font-mono text-xs" aria-label="On this page">
              <div className="text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-zinc-700" /> ON_THIS_PAGE
              </div>
              <ul className="space-y-1 border-l border-zinc-800">
                {post.toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={`block py-1 -ml-px border-l transition-colors leading-snug ${t.depth === 3 ? 'pl-6' : 'pl-3'} ${activeId === t.id ? 'border-accent-400 text-accent-300' : 'border-transparent text-zinc-500 hover:text-zinc-200'}`}
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </main>
  );
}
