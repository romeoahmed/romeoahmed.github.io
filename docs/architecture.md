# Architecture

Astro builds static HTML for GitHub Pages. Reading, links, language selection, code highlighting, and mathematical layout work without JavaScript. Browser modules add interaction and decoration. [Design](design.md) defines their presentation; [writing](writing.md) covers authoring.

## Source map

| Location                                | Responsibility                                                        |
| --------------------------------------- | --------------------------------------------------------------------- |
| `src/pages/`                            | Static routes, locale enumeration, RSS                                |
| `src/layouts/`, `src/components/`       | Document structure and reusable UI                                    |
| `src/content/`, `src/content.config.ts` | Posts, notes, and their schema                                        |
| `src/markdown/`                         | Build-time math and footnote transformations                          |
| `src/i18n/`                             | Locale registry, interface copy, tag labels                           |
| `src/lib/`                              | Site identity, collection access, publication rules, color conversion |
| `src/client/`                           | Browser features and their cleanup                                    |
| `src/styles/`                           | Palette, layout, typography, transition styles                        |
| `public/`                               | Favicon, robots file, licensed math font                              |
| `tests/`                                | Node logic tests and Chromium checks                                  |

`Page.astro` owns the document shell; `Article.astro` composes it for posts. In `src/lib/`, `collections.ts` is the Astro content access boundary, while `publications.ts` and `color.ts` contain pure operations. Browser mounts belong in `src/client/`.

Styles follow their consumers: `shell.css` holds shared page structure, headings, and error states; `post-list.css` serves writing indexes and related posts; home, article, notes, and about each have a stylesheet. `global.css` establishes imports, cascade order, base rules, route transitions, and print behavior.

The manifest and lockfile own dependency versions. Keep a single package; introduce structure when a feature needs it.

## Build and content

[Content Collections](https://docs.astro.build/en/guides/content-collections/) load Markdown and MDX through `glob()` and validate frontmatter with Zod. Publication helpers reject duplicate slugs and translation identities within each collection and locale, including drafts. Public output excludes drafts and sorts by publication date, then ID.

Sätteri processes both formats through Astro’s Markdown integration. Its math visitor calls Temml at build time; its footnote visitor localizes Chinese labels by source path. Astro’s Shiki integration highlights code. MDX embeds Astro components without a hydrated UI framework. Repository content is trusted build input: MDX can execute code.

Routes pass inferred `getStaticPaths()` props into layouts. Article bodies use slots. `Page.astro` renders its slot once to detect MathML before emitting the head, then reuses that HTML. The global stylesheet is explicitly linked before conditional math styles to establish cascade order.

## Languages and URLs

| Page               | URL                                               |
| ------------------ | ------------------------------------------------- |
| Language selection | `/`                                               |
| Writing index      | `/{locale}/`                                      |
| Article            | `/{locale}/posts/{slug}/`                         |
| Notes              | `/{locale}/notes/`, with a fragment for each note |
| About              | `/{locale}/about/`                                |
| RSS                | `/{locale}/rss.xml`                               |

Locales are `en` and `zh-hans`; the Chinese HTML language tag is `zh-Hans`. Astro [i18n routing](https://docs.astro.build/en/guides/internationalization/) prefixes both editions. The root lets readers choose explicitly. A bilingual `404.html` serves missing pages and is marked `noindex`.

Shared templates select typed dictionaries from `src/i18n/`. Translations share a `translationKey`; their slugs may differ. Article language links resolve published counterparts. If one is missing, the page explains this and links to the other writing index.

Canonical URLs identify each page. Article alternates include only published counterparts; the root and localized homes also declare `/` as `x-default`. Each RSS feed includes posts and note links with fragments. Dates display in UTC to preserve the authored calendar day.

## Browser lifetimes and motion

| Owner                   | Responsibility                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Astro ClientRouter      | Navigation, history, document swaps, scroll restoration                                         |
| Native View Transitions | Selected-title travel and page snapshots                                                        |
| GSAP                    | Initial reveals, arrow feedback, anchor scrolling, scene pose and appearance, easing experiment |
| CSS                     | Layout, focus, color feedback, snapshot styling, reduced-motion rules                           |

One owner animates each property. Do not add CSS transform transitions to GSAP targets or replace Astro’s router with animation code.

`navigation.ts` uses Astro’s [navigation lifecycle](https://docs.astro.build/en/guides/view-transitions/#lifecycle-events): select the outgoing title before preparation; pair it, dispose old features, and theme the incoming document before swap; mount features on page load. Async mounts check page lifetime and dispose results that arrive late. Initial text reveals run only on the first page.

Same-page links retain Astro’s fragment history. `anchors.ts` resets Astro’s immediate scroll before paint, then starts GSAP ScrollTo. User input or navigation cancels pending and active motion. Skip links and reduced motion use native scrolling. CSS smooth scrolling stays off.

The theme follows the system unless the reader chooses otherwise. An inline head script applies it before paint; incoming documents receive the same preference before swapping. Reading enhancements mount across all prose blocks, with localized clipboard feedback and heading tracking. The MDX easing experiment is a custom element whose connection and disconnection own one paused GSAP timeline.

## Optional renderers

### Mathematics

Temml emits native MathML with document-scoped macros and build errors for invalid TeX. Its installed STIX stylesheet is included only on pages with math, in the `vendor` layer. The complete STIX Two Math font is self-hosted; [provenance and licensing](../public/fonts/README.md) stay beside the asset.

Only equation references load Temml’s official post-processing script in the browser. The converter stays in the build. A failed reference enhancement leaves mathematical layout intact.

### Diagrams

Mermaid loads when the page contains a `mermaid` fence. It renders after fonts are ready using `render()` and the returned `bindFunctions`. Automatic startup is disabled because the page owns mounting; strict security remains the library default. See [Mermaid usage](https://mermaid.js.org/config/usage.html).

Rendering and theme configuration share a serial queue. Stale requests cannot insert SVG. The source or previous diagram remains visible until its replacement succeeds; failure restores source. Disposal removes observers and measurement elements. The color adapter converts site OKLCH tokens to the sRGB hex Mermaid expects.

### Spatial motif

Babylon Lite loads when a home motif approaches the viewport and WebGPU is available. The CSS composition reserves space and remains visible until the first GPU frame. Three matte boxes use an orthographic camera and a small WGSL gradient material; GSAP updates their pose.

Enable asynchronous shader compilation before registering the scene, and device-loss recovery before creating geometry. Lite owns shader bindings, pipelines, and resource recovery. The app owns visibility, sizing, and disposal. See [Babylon Lite](https://doc.babylonjs.com/lite/).

Invalidations coalesce into animation frames. Settled, hidden, and offscreen scenes schedule no rendering. DPR is capped at 1.75. Colors enter the shader as linear sRGB and are encoded once by the engine. Device loss reveals the static motif while recovery runs; failure releases the scene. There is no WebGL backend or worker protocol.

## Platform and tooling

CSS uses OKLCH without legacy fallbacks, logical properties, Subgrid, and container queries. The cascade is `reset, vendor, base, components, utilities`. MathML retains its native layout. Newly Baseline APIs are allowed; WebGPU is the explicit support exception.

The root TypeScript config references app and tooling projects. Both extend Astro’s strictest preset and use erasable syntax. `@types/web` supplies browser declarations without bundled DOM types; tooling also includes Node types. Astro owns output, so checks use `astro check` and `tsc -p`, not a declaration build.

ESLint, Stylelint, and Prettier use recommended presets and defaults. Astro checking owns component type diagnostics. The ESLint config remains `.mjs` so it loads without an extra loader; tooling checks it with `checkJs`. Dependency overrides belong beside their removal condition in `pnpm-workspace.yaml`.

## Verification and delivery

`pnpm verify` runs formatting, linting, both type checks, the build, and Vitest. Lint and Astro-check warnings fail verification.

| Test boundary            | Coverage                                                                      |
| ------------------------ | ----------------------------------------------------------------------------- |
| Node                     | Publication rules, translations, dates, Markdown transforms, color conversion |
| Built output in Chromium | Metadata, licenses, feeds, MathML, code labels, unenhanced content            |
| Browser modules          | Clipboard, theme, diagrams, heading tracking, title pairing, motion, cleanup  |

Vitest owns both projects; its [Playwright provider](https://vitest.dev/config/browser/playwright) selects the `chromium` channel to match installation with `--no-shell`. Output tests parse a fresh `dist/` as inert documents: they do not execute the full site. Router integration, GPU output, and motion quality need browser review against the [design criteria](design.md#review).

The [workflow](../.github/workflows/deploy.yml) checks pull requests and deploys verified `main` builds. Set the repository’s Pages source to **GitHub Actions**. The official Astro action builds and uploads the artifact; only the deployment job receives Pages and identity-token write permissions. This username repository needs no `base` prefix. See [Astro’s Pages guide](https://docs.astro.build/en/guides/deploy/github/).
