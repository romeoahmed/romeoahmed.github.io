<img src="public/favicon.svg" alt="Blog mark" width="56" height="56">

# Romeo Ahmed

Keep it simple, stupid.

A personal notebook on code, math, and everyday observations, in English and Simplified Chinese.

[Read in English](https://romeoahmed.github.io/en/) · [简体中文](https://romeoahmed.github.io/zh-hans/)

Built with Astro for GitHub Pages. Articles and short notes support searchable text, highlighted code, math, diagrams, and small interactive experiments. Light and dark themes keep the writing clear; motion and a quiet particle field give the site its character.

## Run locally

Use pnpm and a Node.js version supported by [package.json](package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For production checks and preview:

```sh
pnpm exec playwright install --with-deps --no-shell chromium
pnpm verify
pnpm preview
```

`verify` checks formatting, types, lint, the production build, and tests. Search uses the last built index; rebuild after changing content.

## Documentation

- [Writing](docs/writing.md): publish, translate, and embed media.
- [Design](docs/design.md): composition, typography, color, and motion.
- [Architecture](docs/architecture.md): module boundaries, rendering, and deployment.

## License

Website text is [CC BY-NC-SA 4.0](licenses/CC-BY-NC-SA-4.0.txt). The project and code examples, inline or fenced, are [MIT](LICENSE). Third-party material retains its own license.
