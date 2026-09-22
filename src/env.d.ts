/// <reference types="astro/client" />
declare module "temml/dist/temmlPostProcess.js" {
  const temml: { postProcess(element: HTMLElement): void };
  export default temml;
}
