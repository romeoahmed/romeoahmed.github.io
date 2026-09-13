# Working on this blog

This is one static Astro site for GitHub Pages, with English and Simplified Chinese editions. Read the relevant [architecture](docs/architecture.md), [design](docs/design.md), or [writing](docs/writing.md) section before changing its behavior. Keep documentation in English.

## Commands and checks

- Install dependencies: `pnpm install --frozen-lockfile`.
- Start development: `pnpm dev --background`. Manage it with `pnpm astro dev status`, `pnpm astro dev logs`, and `pnpm astro dev stop`.
- Run focused tests: `pnpm test --project unit` or `pnpm test --project browser`. Browser tests need Chromium (`pnpm exec playwright install --with-deps --no-shell chromium`) and a fresh `pnpm build` for output checks.
- After code, configuration, or content changes, run `pnpm verify`. It includes the build before tests. For documentation-only edits, check formatting and links.
- For visual changes, review production preview in the built-in browser: both languages and themes, narrow and wide layouts, keyboard input, and reduced motion. Check normal motion separately.

## Implementation rules

- Consult the relevant official documentation before changing an integration. Use Astro’s guides for [routes](https://docs.astro.build/en/guides/routing/), [components](https://docs.astro.build/en/basics/astro-components/), [content](https://docs.astro.build/en/guides/content-collections/), [styles](https://docs.astro.build/en/guides/styling/), [i18n](https://docs.astro.build/en/guides/internationalization/), and [navigation](https://docs.astro.build/en/guides/view-transitions/).
- Prefer platform and library APIs, recommended presets, and defaults. Add dependencies, abstractions, and directories only for implemented needs.
- Keep TypeScript on 6.x. Use strict, erasable types, pure data transformations, and local mutable state for effects. Use `@types/web` without the bundled DOM library; tooling and tests also have Node types.
- Keep translated interface copy in `src/i18n/` and writing in locale folders. Use shared Astro templates. Preserve the author’s name and motto; do not invent biographical claims.
- Keep text and navigation usable before enhancement. Browser mounts must clean up listeners, observers, animations, and resources, including late async results.
- Astro owns navigation and history; native View Transitions own route snapshots; GSAP owns local motion. Preserve title travel and the 520 ms recent-writing scroll when adjusting curves. See the design document for timing.
- Use OKLCH directly. Newly Baseline capabilities are allowed; WebGPU is the explicit exception. Keep the static motif when GPU rendering is unavailable.
- Write production behavior first, then small tests of meaningful contracts and failure paths. Vitest owns Node and Chromium projects through its Playwright provider.
- Write concise English comments. Use TSDoc only for information names and types cannot convey. Keep machine-specific paths, review logs, and speculative plans out of project documentation.
