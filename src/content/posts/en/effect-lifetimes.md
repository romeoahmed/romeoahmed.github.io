---
translationKey: small-functions
locale: en
title: "Knowing when to stop"
description: "A function can finish while the work it started is still running."
slug: small-functions
publishedAt: 2026-09-02
license: CC-BY-NC-SA-4.0
sample: true
tags: [engineering]
---

A function returns, and its work seems done. But the listener it attached is still waiting for a click. The timer is still counting. The animation has another frame to draw.

Small functions are easier to follow when their effects have an ending, too.

## Keep decisions in plain data

An archive contains entries in two languages. Choosing an edition is a simple data operation: take the entries and a language, then return the matches.

```ts title="publications.ts"
type Entry = {
  title: string;
  locale: "en" | "zh-hans";
};

const forLocale = (entries: readonly Entry[], locale: Entry["locale"]) =>
  entries.filter((entry) => entry.locale === locale);
```

No page to load, no global preference to set. The input stays untouched, and the result is a new array. Three entries in a console are enough to see how it behaves.

## Put setup next to cleanup

A listener has a longer life. Attaching it changes what a future click will do, perhaps long after the surrounding page has been replaced.

```ts title="button.ts"
function mountButton(button: HTMLButtonElement, onClick: () => void) {
  const events = new AbortController();
  button.addEventListener("click", onClick, { signal: events.signal });
  return () => events.abort();
}
```

The returned function gives the caller a way to stop listening. Call it when the feature is no longer needed. Setup and cleanup stay together, so a later change is less likely to leave one behind.

Timers, observers, and animations have different ways to stop. Each can still return a cleanup function. The caller only needs to know when to use it.

## Stop before adding an abstraction

A few cleanup functions may fit comfortably in an array. A more elaborate lifecycle system can wait until there is a problem the array cannot express clearly.

For now, the useful question is small: when this part of the page goes away, what is left running?
