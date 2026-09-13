/// <reference types="astro/client" />
interface Window {
  temml?: { postProcess: (element: HTMLElement) => void };
}
