/**
 * Marks the outgoing title before Astro prepares the next page.
 *
 * @returns A callback for the incoming document, pairing titles with matching content IDs.
 */
export function prepareTitleTransition(to: URL) {
  document.querySelectorAll<HTMLElement>(".post-title").forEach((title) => {
    title.style.removeProperty("view-transition-name");
  });
  const link = document
    .querySelectorAll<HTMLAnchorElement>(".post-row :is(h2, h3) a")
    .values()
    .find((link) => link.pathname === to.pathname);
  const source =
    link?.querySelector<HTMLElement>(".post-title") ??
    document.querySelector<HTMLElement>(".article-heading .post-title");
  const key = source?.dataset["titleKey"];
  if (source) source.style.viewTransitionName = "article-title";
  return (incoming: Document) => {
    const title = key
      ? incoming
          .querySelectorAll<HTMLElement>(".post-title")
          .values()
          .find((title) => title.dataset["titleKey"] === key)
      : undefined;
    if (title) title.style.viewTransitionName = "article-title";
    incoming.documentElement.toggleAttribute("data-title-transition", !!title);
  };
}
