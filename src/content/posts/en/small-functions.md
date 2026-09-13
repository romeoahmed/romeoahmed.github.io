---
translationKey: small-functions
locale: en
title: "Give each effect a home"
description: "Filtering a list is easy to reason about. Event listeners need one more thing: a clear place to stop."
slug: small-functions
publishedAt: 2026-09-02
license: CC-BY-NC-SA-4.0
sample: true
tags: [engineering]
---

A function that returns a filtered list leaves very little behind. An event listener is different: it keeps running after the function that created it has returned.

Both can be small. Only one needs someone to clean up after it.

## Keep decisions in plain data

Suppose an archive holds entries in two languages. Selecting a language does not need access to the page or a global setting. Pass it in.

```ts
type Entry = {
  title: string;
  locale: "en" | "zh-hans";
};

const forLocale = (entries: readonly Entry[], locale: Entry["locale"]) =>
  entries.filter((entry) => entry.locale === locale);
```

The function leaves its input alone. You can try it with three entries in a console, or use it while building a page. There is no setup to remember.

## Put setup next to cleanup

Now consider a button. Attaching a listener changes what future clicks will do. If a page can be replaced without a full reload, that listener needs a lifetime.

```ts
function mountButton(button: HTMLButtonElement, onClick: () => void) {
  const events = new AbortController();
  button.addEventListener("click", onClick, { signal: events.signal });
  return () => events.abort();
}

const dispose = mountButton(button, saveNote);
// Remove the listener when this page leaves the document.
```

The returned function answers the question “How do I stop this?” without requiring the caller to know how the listener was attached.

The same question applies to observers, timers, and animations. They do not all share a cleanup API, but the code that starts them can keep the instructions for stopping them nearby.

## Stop before adding an abstraction

There is a temptation to turn those cleanup functions into a framework. Sometimes that helps. For a handful of page features, an array of functions may be enough.

The boundary is doing the useful work here. Shorter code is welcome when it makes that boundary easier to see.
