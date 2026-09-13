# Design

A personal notebook with the quiet of a future study. The hierarchy is **writing → author → atmosphere**. Depth comes from spacing, clear silhouettes, and controlled light. Movement follows an action, then settles.

## Composition and identity

The author rail anchors wide layouts and becomes a compact header on smaller screens. Aligned dates, titles, summaries, and fine rules organize the writing list. Avoid containers that add no useful grouping.

The home’s tilted particle orbit provides the science-fiction character: a defined rim, sparse dust, and an open center. Keep it beside the introduction and outside the reading column. Articles carry the accent without the scene; the language-selection page hides decoration on narrow screens.

The mark is a circle split by a diagonal gap, with a cool lower segment. Preserve its silhouette at favicon size. **Romeo Ahmed** and **Keep it simple, stupid.** remain separate; mark the motto as English on Chinese pages.

## Typography and color

Inter serves Western text, system fonts Chinese, Geist Mono code and occasional metadata, and STIX Two Math formulas. Keep Inter’s optical sizing and avoid discretionary code ligatures. Prose is `1.0625rem`: English has a `68ch` maximum measure and 1.8 line height; Chinese uses `38em` and 1.95. Container queries move the contents above the prose when space is limited, including with enlarged text.

Let titles wrap. Keep metadata at least 12 px and standalone controls 44 px. Wide code, equations, tables, and diagrams scroll locally; the page does not. Print uses a light palette, wraps code, and removes navigation and decoration.

[tokens.css](../src/styles/tokens.css) defines the palette. Light mode pairs warm paper and dark ink with muted teal. Dark mode uses cool charcoal, warm text, and a softer luminous accent. Tune themes independently in OKLCH, including gradient and color-mix interpolation. Keep reading surfaces opaque. Check actual contrast; decorative rules do not replace visible focus or control boundaries.

## Language and voice

Write each edition naturally in its own language. Interface text should help readers act or recover from an error. Keep technical names where useful; never combine the author, English motto, and topic list into one translated sentence.

Language choice is explicit. Link to a published translation or explain its absence. Do not invent translations or biography. Sample content keeps its visible label; implementation and acceptance notes stay out of website copy.

## Motion

The selected title travels upward into the article heading. Preserve that continuity and restore context on return. Paragraphs use small travel with unchanged scale; the author rail stays still. Language changes use the page transition rather than character morphing.

| Interaction                      | Timing and curve                                              | Intent                                                                                                    |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Selected title                   | 720 ms; `cubic-bezier(.34, 0, .16, 1)`                        | Gentle launch, clear travel, settled arrival                                                              |
| Outgoing page                    | 160 ms; `ease-in` opacity                                     | Clear space for the incoming composition                                                                  |
| Incoming page                    | 400 ms; `cubic-bezier(.2, 0, 0, 1)`                           | 10 px travel; starts at 320 ms with a paired title, otherwise 80 ms; reverses direction on history return |
| Recent writing / same-page links | **520 ms; `sine.inOut`**                                      | Smooth acceleration and deceleration; travel beyond one viewport may extend toward 720 ms                 |
| First-load text                  | 480 ms; `power2.out`                                          | 8 px travel; at most 180 ms total staggering; no replay on route changes                                  |
| Search dialog                    | 320 ms; `power3.out`                                          | 10 px entry, no scaling or result staggering; focus is immediate and dismissal remains native             |
| Link arrows                      | 240 ms; `power2.out`                                          | 3 px down for recent writing, 3 px left for back, 5 px right for article links                            |
| Scene arrival                    | 240 ms; `power1.out` crossfade, 950 ms; `power2.out` settling | Replace the static motif only after a rendered frame; settle once per mount                               |
| Scene pointer response           | 520 ms position / 720 ms influence; `power3.out`              | Retarget local displacement and small depth rotations; release to rest on exit or cancellation            |

Title snapshots preserve aspect ratio and exchange opacity over 120 ms. Color and rule feedback takes 180 ms; focus is immediate. Recent writing lands with a 2 rem inset. Wheel, touch, keyboard, history, and new navigation interrupt scrolling. Retarget from the current pose instead of restarting.

The article experiment compares linear motion with `power2.out` over 720 ms. Playback is explicit; the slider inspects the same timeline. Reduced motion keeps manual inspection and removes playback.

Particle response stays within the motif. Pressure modestly increases displacement; exit, cancellation, or lost focus restores rest. Touch scrolling remains native. No idle rotation, blinking, bloom, or trails.

Reduced motion removes route travel, parallax, and settling, including when changed mid-animation. Content stays visible before enhancement. Theme changes apply promptly without prolonged low-contrast blending. [Architecture](architecture.md#browser-lifetimes-and-motion) defines ownership and cleanup.

## Search and sharing

Topics form a quiet line above the writing list. Related pieces follow the article; notes share one license line at the stream’s end.

Search uses the reading palette, a 16 px input, clear focus, and roomy excerpts. The empty state identifies the edition. Keep the background still and show results without decorative delay. The native contents disclosure remains keyboard-operable in both wide and narrow layouts.

Sharing cards use warm paper, dark ink, the mark, a large title, and a fine footer rule. Keep author and motto separate. Articles receive individual 1200 × 630 cards; other pages use the edition card. Article artwork keeps its authored colors in both themes, with captions nearby.

## Review

Check home, article, notes, and about pages in both languages and themes, at narrow and wide widths and with enlarged text.

- Writing dominates; decoration neither overlaps it nor delays access.
- Titles, metadata, code, and math remain legible; only wide content scrolls locally.
- Keyboard focus, touch targets, translation states, and copy feedback are clear.
- Title travel and scrolling remain continuous under repeated input and history navigation.
- Normal and reduced motion work; settled scenes stop rendering.
- Theme changes, diagrams, and font loading create no distracting gaps or flashes.
- Print preserves content and removes decorative UI.

Automated checks support review; they do not establish motion quality or assistive-technology usability.
