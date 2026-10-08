# AGENTS.md

Static marketing site for CogSend (cogsend.com). Astro 7 + Tailwind v4, no
component framework, no adapter. Cloudflare Pages (`cogsend-site`,
`wrangler.jsonc`) builds and deploys every push to `main`; there is no manual
deploy. A bot commits `src/data/github.json` to `main` (see the refresh workflow),
so pull before pushing.

## Commands

- `npm run dev` — localhost:4321
- `npm run check` — astro check
- `npm run build` — build to `dist/`
- `npm run preview` — serve `dist/` on 4321
- `npm run preview:pages` — serve `dist/` with `public/_headers` applied
- `npm run check:a11y` — axe over every page; needs preview running
- `npm run docs:sync` — rebuild `src/content/docs/` from the app repo's `docs/`
- `npm run docs:check` — report docs drift; writes nothing
- `npm run data:refresh` — rewrite `src/data/github.json` from the GitHub API
- `npm run og` — regenerate `public/og.png`

`check` and `check:a11y` must pass. CI runs both.

## The app repo is the source of truth

github.com/cogsend/cogsend, usually `../cogsend`. Copy from it; never invent.

- `config.ts` `INSTALL_COMMAND` ← app `README.md` install block
- `SocialIcon.astro` ← `src/lib/domain/platform-marks.ts`
- `global.css` tokens ← `src/routes/layout.css` + Tailwind stone classes
- `Logo.astro` ← Cog Four favicon path
- mock copy ← `src/lib/components/Editor.svelte`, `src/routes/posts/+page.svelte`,
  `src/routes/insights/+page.svelte`
- `/docs` prose ← app `docs/`, through `scripts/sync-docs.mjs`
- header stars and release, and the docs commit ← `src/data/github.json`,
  through `scripts/refresh-github-data.mjs`; never hand-edit it

If it changes there, change it here.

## Docs

`/docs` renders the app repo's `docs/` folder. `scripts/sync-docs.mjs` runs before
`dev`, `check` and `build`, and writes `src/content/docs/`, which is gitignored —
never edit it. `src/docs/nav.mjs` owns the sidebar order, the titles, the
descriptions and which app file each page comes from; `src/docs/extras/<slug>.md`
holds what is only true of the website (figures, clips, "where to go next"). Both
are documented in README.md.

- A doc with no nav entry, a nav entry with no doc, a link to a page that does not
  exist, or an extras block anchored to a renamed heading all fail the sync on
  purpose. Fix the nav or the extras; never silence the check.
- Markdown under `src/content/docs/` is gitignored, so Tailwind never scans it.
  Doc styling lives in `src/styles/docs.css`, and a utility class written in a doc
  does nothing.
- Without a sibling checkout (CI, Cloudflare) the sync reads the app at the
  `docs` commit in `src/data/github.json`, the last commit on main to touch
  `docs/`. A docs edit in the app ships when the hourly refresh records it, not
  before. `DOCS_REF` overrides it. A nav or extras change that follows a new
  app docs commit needs `npm run data:refresh` in the same commit, or the build
  reads the old docs against the new nav and fails.
- Heading `#` links and code-block copy buttons are added by the script in
  `DocsLayout.astro`, not by the markdown pipeline; their styles are in
  `docs.css`.
- Search is Pagefind over `dist/docs/**`, built after `astro build`. It is the one
  build-time dependency and it serves from our own origin, so the CSP does not
  move.

## Rules

- Mocks are pictures, not the app: `aria-hidden="true"` on the block, `tabindex="-1"`
  on every control inside. Dropping one fails `aria-hidden-focus`.
- `data-reveal` hides content until scrolled into view. Keep the `html.js` scoping
  and the `@media print` override.
- Every outbound URL lives in `src/config.ts`.
- A new third-party origin needs the CSP in `public/_headers` updated. `astro
  preview` sends no headers at all, so anything header-sensitive — a new origin,
  WASM, a `frame-src` embed — belongs under `npm run preview:pages`, which
  applies `public/_headers`. Otherwise it looks fine locally and breaks in
  production.
- No framework, no new runtime dependencies. Interactivity is vanilla TS in the
  component that owns it. Pagefind is build-time only.
- Light mode only.
- Never hand-edit `public/og.png`; run `npm run og`.

## Commits

Conventional Commits, one logical change per commit, no pushing. Scopes used
here: `site`, `components`, `seo`, `ci`, `a11y`, `docs`.
