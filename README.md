<img src="public/favicon.svg" alt="Romeo Ahmed’s blog mark" width="56" height="56">

# Romeo Ahmed

Keep it simple, stupid.

My personal notebook on code, math, and everyday life. Written in English and Simplified Chinese, with room for articles, short notes, and the occasional experiment.

[Read in English](https://romeoahmed.github.io/en/) · [简体中文](https://romeoahmed.github.io/zh-hans/)

Built with Astro and published on GitHub Pages, with Markdown, MDX, highlighted code, math, and diagrams. Light and dark themes share a quiet spatial motif and title transitions.

## Run locally

Use pnpm and a Node.js version satisfying [package.json](package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev --background
```

Stop the server with `pnpm astro dev stop`. To check the project:

```sh
pnpm exec playwright install --with-deps --no-shell chromium
pnpm verify
```

`verify` checks formatting, linting, types, the production build, and tests. Use `pnpm preview` after a build to review the production site.

## Work on the blog

- [Writing](docs/writing.md): add a post, translate it, or embed an experiment.
- [Design](docs/design.md): visual language, typography, and motion.
- [Architecture](docs/architecture.md): rendering, module boundaries, and delivery.

## License

Website text is [CC BY-NC-SA 4.0](licenses/CC-BY-NC-SA-4.0.txt), unless otherwise noted. The project and code examples, both inline and fenced, are [MIT](LICENSE). Third-party material retains its own terms, including [STIX Two Math’s OFL](public/fonts/OFL.txt).
