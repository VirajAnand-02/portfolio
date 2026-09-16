<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/96699c6b-41bb-46ab-9060-57ba95510540

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Blog

Posts are Markdown files in a separate repo (`BLOG_REPO`, default `VirajAnand-02/blogs`). `npm run build` clones it, renders every `posts/*.md` to HTML (`scripts/build-blog.ts`), builds the site, then writes a static page per post with its own link-preview tags (`scripts/prerender-blog.ts`).

```
push posts/*.md ─▶ GitHub Action calls the Pages deploy hook ─▶ Cloudflare Pages runs `npm run build`
```

`blog-starter/` is a ready-made copy of that repo: sample posts, the frontmatter format, and the deploy workflow.

### One-time setup

1. **Create the posts repo:** push the contents of `blog-starter/` to a new public GitHub repo (`VirajAnand-02/blogs`).
2. **Cloudflare Pages project** (must be connected to Git — deploy hooks don't exist for direct uploads):
   - Build command `npm run build`, output directory `dist`
   - Environment variables: `BLOG_REPO=VirajAnand-02/blogs`, `SITE_URL=https://<your domain>`
3. **Deploy hook:** Pages → Settings → Builds → Deploy hooks → add one for the production branch.
4. **Wire it up:** in the posts repo, add an Actions secret `CF_PAGES_DEPLOY_HOOK` with the hook URL.

From then on, pushing a post to `main` redeploys the site (about a minute).

### Writing locally

```bash
# .env.local
BLOG_DIR=../blog      # a checkout of the posts repo; skips cloning
BLOG_DRAFTS=1         # optional: include draft: true posts
```

`npm run dev` builds the posts before starting. After editing a post, run `npm run blog:build` and refresh.

On Cloudflare the build fails if the posts repo can't be cloned, so an empty blog is never deployed. Locally it only warns.
