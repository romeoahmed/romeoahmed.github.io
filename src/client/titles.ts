/**
 * Selects the outgoing article title for a shared view transition.
 *
 * @returns A callback that pairs the incoming title by content identity, if present.
 */
export function prepareTitleTransition(to: URL) {
  document.querySelectorAll<HTMLElement>(".post-title").forEach((title) => {
    title.style.removeProperty("view-transition-name");
  });
  const link = document
    .querySelectorAll<HTMLAnchorElement>(".post-row h3 a")
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
