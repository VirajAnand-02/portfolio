import { useEffect, useState } from 'react';

// Shapes written by scripts/build-blog.ts
export type TocItem = { id: string; text: string; depth: 2 | 3 };
export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingMinutes: number;
  cover?: string;
  draft?: boolean;
};
export type Post = PostMeta & { html: string; toc: TocItem[] };

const fetchJson = async <T,>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

let indexPromise: Promise<PostMeta[]> | null = null;
export const getIndex = () => (indexPromise ??= fetchJson<PostMeta[]>('/blog/index.json').then((p) => p ?? []));

const postCache = new Map<string, Promise<Post | null>>();
export function getPost(slug: string) {
  if (!postCache.has(slug)) postCache.set(slug, fetchJson<Post>(`/blog/posts/${slug}.json`));
  return postCache.get(slug)!;
}

/** null while loading */
export function usePosts() {
  const [posts, setPosts] = useState<PostMeta[] | null>(null);
  useEffect(() => {
    let alive = true;
    getIndex().then((p) => alive && setPosts(p));
    return () => {
      alive = false;
    };
  }, []);
  return posts;
}

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', opts);
