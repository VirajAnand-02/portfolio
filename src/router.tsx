import React, { useEffect, useState } from 'react';

/* Tiny History-API router: "/", "/blog", "/blog/:slug". Cloudflare Pages serves "/blog/x/" with a trailing slash. */

export type Route = { name: 'home' } | { name: 'blog' } | { name: 'post'; slug: string } | { name: 'notfound'; path: string };

const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

export function matchRoute(path: string): Route {
  if (path === '/') return { name: 'home' };
  if (path === '/blog') return { name: 'blog' };
  const post = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if (post) return { name: 'post', slug: post[1] };
  return { name: 'notfound', path };
}

const scrollToHash = (hash: string) =>
  // wait a tick so the destination page has rendered its sections
  window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' }), 60);

export function navigate(to: string) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin) {
    window.location.href = to;
    return;
  }
  const samePage = normalize(url.pathname) === normalize(window.location.pathname);
  if (!samePage || url.hash !== window.location.hash || url.search !== window.location.search) {
    window.history.pushState(null, '', url.pathname + url.search + url.hash);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  if (url.hash) scrollToHash(url.hash);
  else if (!samePage) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function usePath() {
  const [path, setPath] = useState(() => normalize(window.location.pathname));
  useEffect(() => {
    const onPop = () => setPath(normalize(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export const isPlainLeftClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export const Link = ({ to, onClick, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
  <a
    href={to}
    {...rest}
    onClick={(e) => {
      onClick?.(e);
      if (e.defaultPrevented || !isPlainLeftClick(e) || rest.target === '_blank') return;
      e.preventDefault();
      navigate(to);
    }}
  />
);
