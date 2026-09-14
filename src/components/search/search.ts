import { messages } from "../../i18n/messages";
import { isLocale } from "../../i18n/locales";

// Describe only the Pagefind API used here; its generated bundle has no importable types.
interface SearchResult {
  readonly url: string;
  readonly excerpt: string;
  readonly meta: { readonly title: string };
  readonly sub_results: readonly {
    readonly url: string;
    readonly title: string;
  }[];
}
type ResultReference = { data: () => Promise<SearchResult> };
interface SearchIndex {
  init: () => Promise<void>;
  debouncedSearch: (
    term: string,
  ) => Promise<{ results: readonly ResultReference[] } | null>;
  destroy: () => Promise<void>;
}
interface SearchModule {
  createInstance: (options?: { baseUrl?: string }) => SearchIndex;
}

/** Mounts a page-scoped search index; cleanup also destroys late initialization results. */
export function mountSearch(bundlePath = "/pagefind/", baseUrl?: string) {
  const dialog = document.querySelector<HTMLDialogElement>("#search-dialog");
  const trigger = document.querySelector<HTMLButtonElement>(".search-trigger");
  const locale = dialog?.dataset["locale"];
  if (!dialog || !trigger || !isLocale(locale)) return () => {};
  const t = messages[locale];
  const input = dialog.querySelector("input")!;
  const status = dialog.querySelector<HTMLElement>("[role=status]")!;
  const list = dialog.querySelector("ol")!;
  const more = dialog.querySelector<HTMLButtonElement>(".search-more")!;
  const template = dialog.querySelector("template")!;
  const controller = new AbortController();
  const { signal } = controller;
  let loading: Promise<SearchIndex | undefined> | undefined;
  let request = 0;
  let results: readonly ResultReference[] = [];
  let shown = 0;

  const load = () =>
    (loading ??= (async () => {
      let index: SearchIndex | undefined;
      try {
        const module = (await import(
          /* @vite-ignore */ `${bundlePath}pagefind.js`
        )) as SearchModule;
        if (signal.aborted) return;
        index = module.createInstance(baseUrl ? { baseUrl } : undefined);
        await index.init();
        return index;
      } catch (error) {
        loading = undefined;
        await index?.destroy();
        throw error;
      }
    })());
  const current = (id: number) => !signal.aborted && id === request;
  const append = async (id: number) => {
    const moveFocus = document.activeElement === more;
    const firstNewResult = shown;
    more.disabled = true;
    try {
      const page = await Promise.all(
        results.slice(shown, shown + 6).map((result) => result.data()),
      );
      if (!current(id)) return;
      list.append(
        ...page.map((result) => {
          const item = document.importNode(template.content, true);
          const link = item.querySelector("a")!;
          link.href = result.url;
          link.textContent = result.meta.title;
          // Pagefind escapes indexed text before adding its <mark> elements.
          item.querySelector("p")!.innerHTML = result.excerpt;
          item.querySelector("ul")!.append(
            ...result.sub_results
              .filter((heading) => heading.url !== result.url)
              .slice(0, 3)
              .map((heading) => {
                const entry = document.createElement("li");
                const anchor = document.createElement("a");
                anchor.href = heading.url;
                anchor.textContent = heading.title;
                entry.append(anchor);
                return entry;
              }),
          );
          return item;
        }),
      );
      if (moveFocus) list.children[firstNewResult]?.querySelector("a")?.focus();
      shown += page.length;
      status.textContent = results.length
        ? t.searchCount(results.length)
        : t.searchEmpty;
      more.hidden = shown >= results.length;
    } catch {
      if (current(id)) status.textContent = t.searchError;
    } finally {
      if (current(id)) more.disabled = false;
    }
  };
  const search = async () => {
    const id = ++request;
    const term = input.value.trim();
    list.replaceChildren();
    more.hidden = true;
    status.textContent = term ? t.searchLoading : t.searchHint;
    if (!term) return;
    try {
      const engine = await load();
      if (!engine || !current(id)) return;
      const found = await engine.debouncedSearch(term);
      if (!found || !current(id)) return;
      results = found.results;
      shown = 0;
      await append(id);
    } catch {
      if (current(id)) status.textContent = t.searchError;
    }
  };
  input.addEventListener(
    "focus",
    () => {
      void load().catch(() => {
        // The next query retries initialization and reports any failure.
      });
    },
    { signal },
  );
  input.addEventListener(
    "input",
    (event) => {
      if (event.isComposing) request++;
      else void search();
    },
    { signal },
  );
  input.addEventListener("compositionend", () => void search(), { signal });
  more.addEventListener("click", () => void append(request), { signal });
  dialog.addEventListener(
    "click",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("a") &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
      )
        dialog.close();
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        !event.defaultPrevented &&
        !event.isComposing &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (dialog.open) input.focus();
        else dialog.showModal();
      }
    },
    { signal },
  );
  trigger.hidden = false;
  return () => {
    controller.abort();
    dialog.close();
    trigger.hidden = true;
    void loading
      ?.then((index) => index?.destroy())
      .catch(() => {
        // Initialization or worker shutdown may already have failed.
      });
  };
}
