---
title: Writing and previewing posts locally
date: 2026-09-15
tags: [meta, workflow]
---

You don't need to push to see a post. Point the portfolio at a local checkout of the blog repo and the dev server builds from it.

## Setup

```bash
git clone https://github.com/VirajAnand-02/blogs ../blog
# in the portfolio repo
echo 'BLOG_DIR=../blog' >> .env.local
npm run dev
```

After editing a post, re-run `npm run blog:build` and refresh. Set `BLOG_DRAFTS=1` to include posts marked `draft: true`.

## File naming

The file name becomes the URL: `posts/edge-ai-on-esp32.md` is served at `/blog/edge-ai-on-esp32`. Keep names lowercase with dashes.

Back to the [first post](./hello-world.md).
