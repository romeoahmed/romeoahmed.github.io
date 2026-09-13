# Working on this blog

One static Astro site for GitHub Pages, in English and Simplified Chinese. Read the relevant [architecture](docs/architecture.md), [design](docs/design.md), or [writing](docs/writing.md) section before editing.

## Commands and verification

- Install: `pnpm install --frozen-lockfile`.
- Background development: `pnpm dev --background`. Use `pnpm astro dev status`, `logs`, and `stop` to manage it. Stop temporary servers when finished.
- Focused tests: `pnpm test --project unit` or `pnpm test --project browser`. Browser tests require Chromium (`pnpm exec playwright install --with-deps --no-shell chromium`) and a fresh `pnpm build`.
- Run `pnpm verify` after code, configuration, or content changes. For documentation-only edits, check formatting and links.
- Review visual changes in the built-in browser using a production preview: both languages and themes, narrow and wide layouts, keyboard input, and normal and reduced motion.

## Boundaries

- Consult official documentation before changing an integration. Prefer native APIs, recommended presets, and defaults; add dependencies or abstractions only for implemented needs.
- Keep TypeScript on 6.x with strict, erasable types. Prefer pure transformations and local state for effects. Use `@types/web` through the native library replacement configured in `tsconfig.app.json`; tooling and tests retain Node types.
- Keep interface translations in `src/i18n/`, content in locale folders, and markup in shared Astro templates. Preserve **Romeo Ahmed** and **Keep it simple, stupid.**; do not invent biography.
- Keep reading and navigation usable before enhancement. Dispose browser effects and late async results on navigation.
- Astro owns navigation and history, View Transitions own snapshots, and GSAP owns local motion. Preserve title travel and the **520 ms** recent-writing scroll; follow the design timing table.
- Use OKLCH directly and Newly Baseline platform features. WebGPU is the support exception; retain the static motif when unavailable.
- Implement production behavior first, then small tests of contracts and failure paths. Vitest owns Node and Chromium through its Playwright provider.
- Write concise English documentation and comments. Follow [TSDoc](https://tsdoc.org/) for callable contracts; explain units, ownership, or failure behavior rather than repeating types. Exclude local machine details, audit logs, and speculative plans.
