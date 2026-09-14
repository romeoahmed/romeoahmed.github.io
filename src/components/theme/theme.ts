const nextPreference = {
  system: "light",
  light: "dark",
  dark: "system",
} as const;
type Preference = keyof typeof nextPreference;
let sessionPreference: Preference | undefined;

const resolveTheme = (preference: Preference, dark: boolean) =>
  preference === "system" ? (dark ? "dark" : "light") : preference;

function themePreference(): Preference {
  if (sessionPreference) return sessionPreference;
  try {
    const value = localStorage.getItem("theme");
    if (value === "light" || value === "dark") return value;
  } catch {
    // Storage is optional; fall back to the system theme.
  }
  return "system";
}

/** Applies the saved or session preference, including to Astro's incoming document. */
export function applyTheme(target: Document = document) {
  target.documentElement.dataset["theme"] = resolveTheme(
    themePreference(),
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

/**
 * Synchronizes the theme control with the selected preference.
 *
 * @returns Removes listeners and hides the control.
 */
export function mountTheme() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!(button instanceof HTMLButtonElement)) return () => {};
  const controller = new AbortController();
  const media = matchMedia("(prefers-color-scheme: dark)");
  const name = button.dataset["label"] ?? button.getAttribute("aria-label");
  const label = button.querySelector("[data-theme-label]");
  let preference = themePreference();
  const update = () => {
    const theme = resolveTheme(preference, media.matches);
    if (document.documentElement.dataset["theme"] !== theme)
      document.documentElement.dataset["theme"] = theme;
    for (const icon of button.querySelectorAll<HTMLElement>(
      "[data-theme-icon]",
    ))
      icon.hidden = icon.dataset["themeIcon"] !== preference;
    const text = button.dataset[preference] ?? preference;
    if (label) label.textContent = text;
    button.setAttribute("aria-label", `${name}: ${text}`);
  };
  button.hidden = false;
  update();
  button.addEventListener(
    "click",
    () => {
      preference = nextPreference[preference];
      sessionPreference = preference;
      try {
        localStorage.setItem("theme", preference);
      } catch {
        // The in-memory preference survives client-side navigation.
      }
      update();
    },
    { signal: controller.signal },
  );
  media.addEventListener("change", update, { signal: controller.signal });
  return () => {
    controller.abort();
    button.hidden = true;
  };
}
