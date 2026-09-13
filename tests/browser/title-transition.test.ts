import { expect, test } from "vitest";
import { prepareTitleTransition } from "../../src/client/title-transition";

test("only the chosen title is paired with the destination article", ({
  onTestFinished,
}) => {
  onTestFinished(() => document.body.replaceChildren());
  document.body.innerHTML = `<div class="post-row"><h3><a href="/en/posts/first/">
    <span class="post-title" data-title-key="en/first">First</span></a></h3></div>
    <div class="post-row"><h3><a href="/en/posts/second/">
    <span class="post-title" data-title-key="en/second">Second</span></a></h3></div>`;
  const titles = [...document.querySelectorAll<HTMLElement>(".post-title")];
  const prepare = (slug: string) =>
    prepareTitleTransition(new URL(`/en/posts/${slug}/`, location.href));
  const pair = prepare("second");
  const name = titles[1]!.style.viewTransitionName;
  expect(name).not.toBe("");
  expect(titles[0]!.style.viewTransitionName).toBe("");
  const newDocument = new DOMParser().parseFromString(
    '<h1><span class="post-title" data-title-key="en/second">Second</span></h1>',
    "text/html",
  );
  pair(newDocument);
  expect(
    newDocument.querySelector<HTMLElement>(".post-title")!.style
      .viewTransitionName,
  ).toBe(name);
  expect(
    newDocument.documentElement.hasAttribute("data-title-transition"),
  ).toBe(true);
  prepare("first");
  expect(titles.map((title) => title.style.viewTransitionName)).toEqual([
    name,
    "",
  ]);
  const unrelated = document.implementation.createHTMLDocument();
  prepare("second")(unrelated);
  expect(unrelated.documentElement.hasAttribute("data-title-transition")).toBe(
    false,
  );
});

test("returning to an index pairs by content identity rather than heading text", ({
  onTestFinished,
}) => {
  onTestFinished(() => document.body.replaceChildren());
  document.body.innerHTML =
    '<h1 class="article-heading"><span class="post-title" data-title-key="en/first">Same title</span></h1>';
  const incoming = new DOMParser().parseFromString(
    '<span class="post-title" data-title-key="en/other">Same title</span><span class="post-title" data-title-key="en/first">Same title</span>',
    "text/html",
  );
  prepareTitleTransition(new URL("/en/", location.href))(incoming);
  const [other, selected] =
    incoming.querySelectorAll<HTMLElement>(".post-title");
  expect(other!.style.viewTransitionName).toBe("");
  expect(selected!.style.viewTransitionName).toBe(
    document.querySelector<HTMLElement>(".post-title")!.style
      .viewTransitionName,
  );
  expect(incoming.documentElement.hasAttribute("data-title-transition")).toBe(
    true,
  );
});
