# Architecture

Astro generates static HTML for GitHub Pages. Reading, navigation, code highlighting, and MathML work before JavaScript; browser modules add search, diagrams, and motion. See [design](design.md) for presentation and [writing](writing.md) for authoring.

## Source map

| Location                                | Responsibility                                                      |
| --------------------------------------- | ------------------------------------------------------------------- |
| `src/pages/`                            | Routes, RSS, and sharing-image endpoints                            |
| `src/layouts/`, `src/components/`       | Document shell, article layout, reusable UI                         |
| `src/content/`, `src/content.config.ts` | Localized writing and schema                                        |
| `src/markdown/`                         | Code, math, and footnote transformations                            |
| `src/i18n/`                             | Locales, interface copy, tag labels                                 |
| `src/lib/`                              | Content access, publication rules, colors, particles, sharing cards |
| `src/client/`                           | Browser features and their lifetimes                                |
| `src/styles/`                           | Shared and page-specific styles                                     |

`Page.astro` owns the document; `Article.astro` composes it for posts. `collections.ts` accesses Astro content, while `publications.ts` handles publication rules. `lifecycle.ts` connects browser mounts to navigation. Keep this as one package; the manifest and lockfile own dependency versions.

Styles follow their consumers. Page-specific stylesheets load through their templates; `global.css` establishes cascade order and shared styles. The cascade is `reset, vendor, base, components, utilities`. UI icons use direct [Lucide](https://lucide.dev/guide/astro/getting-started) imports; the mark and particle motif remain custom.

## Build and content

[Content Collections](https://docs.astro.build/en/guides/content-collections/) load Markdown and MDX with `glob()` and validate frontmatter with Zod. Slugs and translation keys must be unique per collection and locale, including drafts. Published entries exclude drafts and sort by date, then ID.

Sätteri processes both formats. Temml converts math to MathML with document-scoped macros; invalid TeX fails the build. Footnote labels follow the content locale. Expressive Code supplies highlighting, frames, copy controls, markers, and its official line-number plugin through `satteri-expressive-code`. Astro’s separate highlighter is disabled. Keep plugin versions compatible with Sätteri’s Expressive Code version.

MDX embeds Astro components without a hydrated framework. Treat it as executable, trusted repository content. Routes pass inferred `getStaticPaths()` props into layouts. `Page.astro` renders its slot once to detect MathML before writing the head, then reuses that HTML. Its explicit global stylesheet link establishes layer order before conditional math styles.

## Languages and URLs

| Page               | URL                       |
| ------------------ | ------------------------- |
| Language selection | `/`                       |
| Writing index      | `/{locale}/`              |
| Article            | `/{locale}/posts/{slug}/` |
| Notes              | `/{locale}/notes/#slug`   |
| About              | `/{locale}/about/`        |
| Topic              | `/{locale}/topics/{tag}/` |
| RSS                | `/{locale}/rss.xml`       |

[Astro i18n](https://docs.astro.build/en/guides/internationalization/) prefixes both `en` and `zh-hans`; Chinese HTML uses `zh-Hans`. The root offers an explicit choice. A bilingual, unindexed `404.html` handles missing pages.

Shared templates use typed dictionaries. Article language links resolve published entries with the same `translationKey`; a missing translation links to the other writing index with an explanation. Topic pages exist only for populated tags. Related posts prefer shared tags within the edition, then publication order.

Pages declare canonical URLs; article alternates list published counterparts only. The root and localized homes include an `x-default` link to `/`. RSS combines posts and note fragments. Display dates use UTC to preserve authored calendar days.

## Browser lifetimes and motion

| Owner                   | Responsibility                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| Astro ClientRouter      | Navigation, history, swaps, scroll restoration                                 |
| Native View Transitions | Route snapshots and paired-title travel                                        |
| GSAP                    | Reveals, control feedback, anchor scrolling, scene response, easing experiment |
| CSS                     | Layout, focus, color feedback, snapshot styles, reduced motion                 |

Each animated property has one owner. [CSSPlugin](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/) handles transforms and opacity; `quickTo()` retargets pointer feedback. Completed entrances clear temporary properties. `matchMedia().revert()` restores styles when effects end or motion preferences change. The search entrance reuses one tween, reverting on close without destroying it.

`lifecycle.ts` follows Astro’s [navigation events](https://docs.astro.build/en/guides/view-transitions/#lifecycle-events): select the outgoing title before preparation; pair titles, dispose features, and theme the incoming document before swap; mount on page load. Dispose async mounts that finish after their page has left. Text reveals run on first load only.

Anchor scrolling preserves Astro’s fragment history, resetting its immediate scroll before paint so GSAP can start from the click position. Input or navigation cancels pending and active motion. Skip links and reduced motion scroll natively; CSS smooth scrolling stays off.

The inline head script applies the theme before paint; subsequent swaps use the same preference. The contents disclosure derives its initial open state from CSS positioning. The MDX easing experiment owns its timeline through custom-element connection and disconnection.

## Search and renderers

### Search

[astro-pagefind](https://github.com/shishkin/astro-pagefind) indexes built HTML and serves that index during development. Rebuild after editing content. Only article and note bodies are indexed; navigation, metadata, licenses, related reading, diagram source, and code controls are excluded. Notes retain heading fragments for search links.

[Pagefind](https://pagefind.app/docs/api/) owns language selection, workers, debouncing, ranking, and excerpts. Each page creates and destroys its own instance, including late initialization results. Input focus warms the index; queries retry failed initialization. Results load six at a time. Native dialog commands own focus and dismissal; GSAP owns entry. Results remain ordinary navigation links.

Chinese compounds can occasionally miss matches because indexing and query tokenization differ; see the [upstream issue](https://github.com/Pagefind/pagefind/issues/1237).

### Math and diagrams

Pages containing MathML load Temml’s STIX layout rules and STIX Two Math through Astro’s local font provider. This preserves the full mathematical glyph range. Only equation references need Temml’s browser post-processing script; formulas remain readable if it fails.

Mermaid loads only for diagram fences, waits for fonts, and uses [`render()` and `bindFunctions`](https://mermaid.js.org/config/usage.html). Automatic startup is disabled. A shared queue serializes global theme configuration and rendering. Stale results cannot insert SVG; the previous diagram remains visible until its replacement succeeds, and failures restore source. Cleanup removes observers and measurement elements. The color adapter converts OKLCH tokens to sRGB hex.

### Particle field

[Babylon Lite](https://doc.babylonjs.com/lite/) loads near the viewport when WebGPU is available. `particle-field.ts` supplies deterministic positions to the SVG fallback and GPU scene. One thin-instanced plane draws camera-facing particles through an orthographic camera. GSAP smooths pointer response; WGSL applies local displacement and circular coverage. Instance buffers remain fixed after creation.

Enable asynchronous compilation before scene registration and device recovery before geometry creation. Lite owns pipelines, bindings, and recovery; the mount owns sizing, visibility, and disposal. The SVG stays visible until the first frame and returns during device loss. Failed recovery releases the scene.

Invalidations coalesce into animation frames; settled, hidden, and offscreen scenes stop rendering. Shader colors are linear sRGB and encoded once by the engine. An opaque canvas clears to the page color so particle blending remains in linear light. Pointer Events stay local and passive; reduced motion keeps the resting field.

## Images and fonts

[Astro images](https://docs.astro.build/en/guides/images/) use Sharp and constrained layouts to generate responsive WebP. `Figure.astro` adds captions to `Image`. Takumi generates PNG sharing cards at static endpoints, reusing one renderer with local Inter and Noto Sans SC fonts. Article metadata also supplies `BlogPosting` JSON-LD. No image renderer ships to the browser.

[Astro Fonts](https://docs.astro.build/en/guides/fonts/) self-hosts installed font packages and calculates fallback metrics. Inter supplies Western text, Geist Mono code, and system fonts Chinese text. Only normal Latin Inter is preloaded. Noto Sans SC is limited to sharing cards; STIX Two Math loads only with formulas.

## Tooling and delivery

The root TypeScript config exposes app and tooling projects to the editor and ESLint. The app extends [Astro’s strictest preset](https://docs.astro.build/en/guides/typescript/#configuration); tooling and tests inherit it and add Node types. Checks use `astro check` and `tsc -p`; Astro owns output.

`@typescript/lib-dom` aliases `@types/web`. With [`libReplacement`](https://www.typescriptlang.org/tsconfig/libReplacement.html) enabled, both the configured DOM library and Astro’s explicit DOM references resolve to that package. Do not also load `web` through `types` or add a second DOM declaration package.

ESLint uses recommended syntax and type-aware rules; Astro checking handles component types. Its `.mjs` config loads without a loader or experimental flag. Stylelint uses the standard preset; Prettier owns formatting. Dependency overrides include their removal condition in `pnpm-workspace.yaml`.

`pnpm verify` runs formatting, types, lint, build, and Vitest. Lint and Astro-check warnings fail it. Vitest owns Node and Chromium through its [Playwright provider](https://vitest.dev/config/browser/playwright). Built-output tests parse inert documents; they do not exercise the full router. GPU submission checks depend on adapter availability, while initialization-failure tests always cover the SVG fallback. Production browser review remains necessary for motion and rendering quality.

The [workflow](../.github/workflows/deploy.yml) verifies pull requests and deploys `main`. Set Pages source to **GitHub Actions**. The official Astro action builds and uploads the artifact; only deployment receives Pages and identity-token write permissions. This username repository needs no `base` prefix. See [Astro’s Pages guide](https://docs.astro.build/en/guides/deploy/github/).
