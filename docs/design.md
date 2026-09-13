# Design

A personal notebook with the quiet of a future study. Technical articles, essays, and diary entries share a comfortable reading surface. Short notes hold thoughts that need only a few lines.

The hierarchy is **writing → author → atmosphere**. Depth comes from spacing, layered planes, and controlled light. Movement explains a choice, then settles.

## Composition and identity

The author rail anchors the wide layout. On smaller screens, it becomes a compact header. Article lists use aligned dates, titles, summaries, and fine rules. Containers group content only when that grouping helps the reader.

The home’s three offset planes carry the science-fiction character: matte surfaces, one illuminated edge, restrained perspective. Keep the motif beside the introduction and outside the reading column. Articles inherit its geometry and accent without the decorative scene.

The mark is a circular body split by one diagonal gap, with a cool lower segment. Preserve its silhouette at favicon size. The author remains **Romeo Ahmed**; **Keep it simple, stupid.** is a separate motto, marked as English on Chinese pages.

## Typography and color

Use the system prose stack, monospace for code and occasional metadata, and STIX Two Math for formulas. The current prose size is `1.0625rem`; English uses a `68ch` maximum measure and 1.8 line height, Chinese `38em` and 1.95. These are maximum widths, not a reason to squeeze sidebars into narrow layouts.

Titles wrap naturally. Keep dates and reading estimates secondary. Code, equations, tables, and diagrams may scroll locally; the whole page should not. Print uses a light reading palette, wraps code, and removes navigation and decoration.

[tokens.css](../src/styles/tokens.css) is the palette authority. Light mode uses warm paper, dark ink, and a muted teal accent. Dark mode uses cool charcoal, warm text, and a softer luminous accent. Tune each theme independently. Use OKLCH directly, including explicit OKLCH interpolation for authored gradients and mixes.

Reading surfaces stay opaque and calm. Keep luminous edges and strong depth cues inside the motif. Check actual foreground/background contrast; lightness differences alone do not establish readability. Decorative rules are not substitutes for visible focus or control boundaries.

## Language and voice

Write each edition as natural prose in its own language. Keep technical names where useful, but avoid combining the author, English motto, and a translated topic list into one sentence. Interface text should help readers choose, read, copy, or recover from an error.

Language selection is explicit. Link to an article’s real translation or explain its absence and offer the other archive. Do not invent translations or a personal biography. Examples retain a short visible label; implementation notes and acceptance terminology stay out of website copy.

## Motion

Preserve the selected title’s upward journey into the article heading. It is the main transition; paragraphs follow with little travel and unchanged scale. The author rail stays still. Only the selected article title is paired, and returning restores its context. Language changes use the page transition rather than morphing individual characters.

| Interaction                      | Timing and curve                                                   | Intent                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Selected title                   | 720 ms; `cubic-bezier(.34, 0, .16, 1)`                             | Gentle launch, clear travel, settled arrival                                                              |
| Outgoing page                    | 160 ms; `ease-in` opacity                                          | Clear space for the incoming composition                                                                  |
| Incoming page                    | 400 ms; `cubic-bezier(.2, 0, 0, 1)`                                | 10 px travel; starts at 320 ms with a paired title, otherwise 80 ms; reverses direction on history return |
| Recent writing / same-page links | **520 ms; `sine.inOut`**                                           | Smooth acceleration and deceleration; travel beyond one viewport may extend toward 720 ms                 |
| First-load text                  | 480 ms; `power2.out`                                               | 8 px travel; at most 180 ms total staggering; no replay on route changes                                  |
| Link arrows                      | 240 ms; `power2.out`                                               | 3 px down for recent writing, 3 px left for back, 5 px right for article links                            |
| Scene arrival                    | 240 ms; `power1.out` crossfade, 1050 ms; `power2.inOut` separation | Replace the static motif only after a rendered frame; unfold once per mount                               |
| Scene pointer response           | 380 ms; `power2.out`                                               | Retarget small rotations from the current pose                                                            |

Title snapshots preserve aspect ratio and exchange opacity over the first 120 ms. CSS color and rule feedback takes 180 ms; focus is immediate. The recent-writing destination has a 2 rem inset. Wheel, touch, keyboard input, history, or a new navigation interrupts scrolling. Do not restart a response from an obsolete pose or make readers wait for decoration.

The article experiment compares linear motion with `power2.out` over 720 ms. Playback is explicit; its slider inspects the same timeline. Reduced motion removes playback but retains manual inspection.

Reduced motion removes route travel, parallax, and decorative settling, including when the preference changes during an animation. Content remains visible before enhancement. Theme changes apply the new reading palette promptly; avoid a prolonged low-contrast blend. [Architecture](architecture.md#browser-lifetimes-and-motion) defines animation ownership and cleanup.

## Review

Review home, article, notes, and about pages in both languages and themes, at narrow and wide widths and with enlarged text.

- Writing remains dominant; decoration neither overlaps it nor delays access.
- Titles, metadata, math, and code remain legible; only wide content scrolls locally.
- Keyboard focus, touch controls, missing translations, and copy feedback are understandable.
- Title travel and anchor scrolling feel continuous under repeated input and history navigation.
- Normal and reduced motion both work; settled scenes stop rendering.
- Theme changes, diagram replacement, and font loading do not create distracting gaps or flashes.
- Printing preserves readable content and removes decorative UI.

Automated contrast and behavior checks support this review; they do not establish animation quality, assistive-technology usability, or GPU correctness.
