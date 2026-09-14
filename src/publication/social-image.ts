import { readFile, readdir } from "node:fs/promises";
import { Renderer, type Node } from "takumi-js/node";
import { site } from "../site";

const family = "Noto Sans SC";
let renderer: Promise<Renderer> | undefined;

async function createRenderer() {
  const engine = new Renderer();
  const directory = new URL(
    "./files/",
    import.meta.resolve("@fontsource-variable/noto-sans-sc/package.json"),
  );
  const files = (await readdir(directory)).filter((file) =>
    file.endsWith("-wght-normal.woff2"),
  );
  await engine.registerFont({
    name: "Inter",
    data: await readFile(
      new URL(
        import.meta
          .resolve("@fontsource-variable/inter/files/inter-latin-standard-normal.woff2"),
      ),
    ),
  });
  await Promise.all(
    files.map(async (file) =>
      engine.registerFont({
        name: file,
        subsetOf: family,
        data: await readFile(new URL(file, directory)),
      }),
    ),
  );
  return engine;
}

/** Renders a PNG sharing card, reusing one renderer and its fonts across endpoints. */
export async function socialImage(title: string, edition: string) {
  const tree: Node = {
    type: "container",
    style: {
      width: "100%",
      height: "100%",
      padding: 64,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      fontFamily: `Inter, ${family}`,
      backgroundColor: "oklch(97% 0.008 85)",
      color: "oklch(27% 0.012 210)",
    },
    children: [
      {
        type: "text",
        text: edition,
        style: { fontSize: 22, color: "oklch(49% 0.018 210)" },
      },
      {
        type: "text",
        text: title,
        style: {
          width: 900,
          fontSize: 68,
          fontWeight: 500,
          lineHeight: 1.2,
          textWrap: "balance",
        },
      },
      {
        type: "container",
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          borderTop: "1px solid oklch(82% 0.015 195)",
          paddingTop: 28,
        },
        children: [
          {
            type: "text",
            text: site.author,
            style: { fontSize: 28, fontWeight: 500 },
          },
          {
            type: "text",
            text: "Keep it simple, stupid.",
            style: { fontSize: 20, color: "oklch(49% 0.018 210)" },
          },
        ],
      },
      {
        type: "container",
        style: {
          position: "absolute",
          top: 64,
          right: 64,
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundImage:
            "linear-gradient(145deg, oklch(27% 0.012 210) 45%, oklch(97% 0.008 85) 45%, oklch(97% 0.008 85) 55%, oklch(44% 0.065 195) 55%)",
        },
      },
    ],
  };
  renderer ??= createRenderer();
  return (await renderer).render(tree, {
    width: 1200,
    height: 630,
    format: "png",
  });
}
