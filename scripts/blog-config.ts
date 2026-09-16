import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

export const ROOT = process.cwd();
export const IS_CI = Boolean(process.env.CF_PAGES || process.env.CI);

/** GitHub repo holding the markdown, e.g. "VirajAnand-02/blog" */
export const BLOG_REPO = process.env.BLOG_REPO || 'VirajAnand-02/blogs';
export const BLOG_BRANCH = process.env.BLOG_BRANCH || 'main';
/** Local checkout of the posts repo; skips cloning when set (handy for writing locally) */
export const BLOG_DIR = process.env.BLOG_DIR ? path.resolve(ROOT, process.env.BLOG_DIR) : null;
export const INCLUDE_DRAFTS = process.env.BLOG_DRAFTS === '1';

/** Absolute origin used for canonical / og:url / RSS links */
export const SITE_URL = (process.env.SITE_URL || process.env.CF_PAGES_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const CACHE_DIR = path.join(ROOT, '.blog-cache');
export const PUBLIC_BLOG = path.join(ROOT, 'public', 'blog');
export const DIST = path.join(ROOT, 'dist');

export const SITE_NAME = 'Viraj Anand';

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

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
