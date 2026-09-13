import {
  addToScene,
  createBox,
  createEngine,
  createFreeCamera,
  createSceneContext,
  createShaderMaterial,
  createTransformNode,
  disposeEngine,
  disposeScene,
  enableAsyncShaderPipelineCompilation,
  enableDeviceLostSceneRecovery,
  enableOrthographicCamera,
  registerScene,
  renderFrame,
  resizeEngine,
  setShaderVector3,
  type DeviceLostRecoveryHandle,
  type EngineContext,
  type SceneContext,
} from "@babylonjs/lite";
import { gsap } from "gsap";
import { cssColorToLinear } from "../lib/color";

const varyings = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) gradient: f32,
}`;

function panelMaterial() {
  return createShaderMaterial({
    vertexSource: `${varyings}
      @vertex fn mainVertex(input: VertexInput) -> VertexOutput {
        return VertexOutput(
          shaderSystem.worldViewProjection * vec4f(input.position, 1.0),
          dot(input.uv, vec2f(0.2, 0.8)),
        );
      }`,
    fragmentSource: `${varyings}
      @fragment fn mainFragment(input: VertexOutput) -> @location(0) vec4f {
        // Curve the interpolated gradient per fragment, not per vertex.
        let light = smoothstep(0.0, 1.0, input.gradient);
        return vec4f(mix(shaderUniforms.shade, shaderUniforms.surface, light), 1.0);
      }`,
    attributes: ["position", "uv"],
    uniforms: [
      "worldViewProjection",
      { name: "surface", type: "vec3<f32>" },
      { name: "shade", type: "vec3<f32>" },
    ],
  });
}

/**
 * Mounts the WebGPU scene and renders frames only when its appearance changes.
 *
 * @param signal - Page lifetime; canceled initialization is disposed when it completes.
 * @returns Cleanup that releases GPU resources, observers, and animation state.
 */
export async function mountScene(host: HTMLElement, signal: AbortSignal) {
  const stage = host.querySelector(".scene-stage");
  if (!stage || signal.aborted || !navigator.gpu) return () => {};
  const canvas = document.createElement("canvas");
  const controller = new AbortController();
  let engine: EngineContext | undefined;
  let scene: SceneContext | undefined;
  let recovery: DeviceLostRecoveryHandle | undefined;
  let motion: gsap.MatchMedia | undefined;
  let appearance: gsap.core.Timeline | undefined;
  let resize: ResizeObserver | undefined;
  let intersection: IntersectionObserver | undefined;
  let theme: MutationObserver | undefined;
  let ready = false,
    disposed = false,
    visible = true,
    frame = 0;
  const cancelFrame = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    cancelFrame();
    controller.abort();
    motion?.revert();
    resize?.disconnect();
    intersection?.disconnect();
    theme?.disconnect();
    recovery?.disable();
    host.removeAttribute("data-scene-ready");
    canvas.remove();
    if (scene) disposeScene(scene);
    if (engine) disposeEngine(engine);
  };
  const invalidate = () => {
    if (!ready || frame || disposed || !visible || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!engine || disposed || !ready || !visible || document.hidden) return;
      try {
        renderFrame(engine, 0);
        if (!host.hasAttribute("data-scene-ready")) {
          host.setAttribute("data-scene-ready", "");
          appearance?.play();
        }
      } catch {
        dispose();
      }
    });
  };
  try {
    stage.append(canvas);
    const gpu = await createEngine(canvas, {
      alphaMode: "premultiplied",
      srgb: true,
      maxDevicePixelRatio: 1.75,
    });
    engine = gpu;
    if (signal.aborted) {
      dispose();
      return dispose;
    }
    signal.addEventListener("abort", dispose, { once: true });
    enableAsyncShaderPipelineCompilation(gpu);
    // Enable recovery before mesh creation so Lite retains geometry for rebuilding.
    recovery = enableDeviceLostSceneRecovery(gpu, {
      onLost: () => {
        ready = false;
        appearance?.pause(0);
        cancelFrame();
        host.removeAttribute("data-scene-ready");
      },
      onRecovered: () => {
        ready = true;
        invalidate();
      },
      onRecoveryFailed: dispose,
    });
    scene = createSceneContext(gpu);
    scene.clearColor = { r: 0, g: 0, b: 0, a: 0 };
    const camera = createFreeCamera(
      { x: 6, y: 4, z: -10 },
      { x: 0, y: 0, z: 0 },
    );
    const bounds = enableOrthographicCamera(camera);
    scene.camera = camera;
    const group = createTransformNode("pages");
    group.rotation.z = 0.13;
    const material = panelMaterial();
    const edgeMaterial = panelMaterial();
    const lineMaterial = panelMaterial();
    const panels = Array.from({ length: 3 }, (_, i) => {
      const panel = createBox(gpu, {
        width: 2.35,
        height: 3.2,
        depth: 0.045,
      });
      panel.material = material;
      panel.position.set((i - 1) * 0.43, (i - 1) * 0.14, (i - 1) * 0.7);
      group.children.push(panel);
      if (i === 0) {
        const edge = createBox(gpu, {
          width: 0.012,
          height: 3.2,
          depth: 0.05,
        });
        edge.material = edgeMaterial;
        edge.position.x = -1.175;
        panel.children.push(edge);
        for (const y of [-1.12, 1.12]) {
          const line = createBox(gpu, {
            width: 1.6,
            height: 0.007,
            depth: 0.005,
          });
          line.material = lineMaterial;
          line.position.set(0, y, -0.026);
          panel.children.push(line);
        }
      }
      return panel;
    });
    addToScene(scene, group);
    const syncColor = () => {
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) =>
        cssColorToLinear(css.getPropertyValue(`--color-${name}`));
      const surface = color("surface"),
        shade = color("depth"),
        accent = color("accent");
      setShaderVector3(material, "surface", surface);
      setShaderVector3(material, "shade", shade);
      const lineColor: [number, number, number] = [
        surface[0] * 0.8 + accent[0] * 0.2,
        surface[1] * 0.8 + accent[1] * 0.2,
        surface[2] * 0.8 + accent[2] * 0.2,
      ];
      for (const key of ["surface", "shade"]) {
        setShaderVector3(edgeMaterial, key, accent);
        setShaderVector3(lineMaterial, key, lineColor);
      }
      invalidate();
    };
    const size = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      resizeEngine(gpu);
      bounds.left = (-2.7 * width) / height;
      bounds.right = -bounds.left;
      bounds.top = 2.7;
      bounds.bottom = -2.7;
      invalidate();
    };
    size();
    syncColor();
    await registerScene(scene);
    if (disposed) return dispose;
    ready = true;
    resize = new ResizeObserver(size);
    resize.observe(host);
    theme = new MutationObserver(syncColor);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) invalidate();
      else cancelFrame();
    });
    intersection.observe(host);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) cancelFrame();
        else invalidate();
      },
      { signal: controller.signal },
    );
    motion = gsap.matchMedia();
    motion.add(
      {
        animate: "(prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const animate = context.conditions?.["animate"];
        const events = new AbortController();
        appearance = gsap
          .timeline({ paused: true })
          .to(
            stage,
            { opacity: 1, duration: animate ? 0.24 : 0, ease: "power1.out" },
            0,
          )
          .to(
            ".static-scene",
            { opacity: 0, duration: animate ? 0.24 : 0, ease: "power1.out" },
            0,
          );
        if (host.hasAttribute("data-scene-ready")) appearance.progress(1);
        const pose = { x: 0, y: 0, spread: 1 };
        const update = () => {
          group.rotation.set(pose.x, pose.y, 0.13);
          panels.forEach((panel, i) => {
            panel.position.z = (i - 1) * 0.7 * pose.spread;
          });
          invalidate();
        };
        if (animate) {
          gsap.from(pose, {
            spread: 0.72,
            duration: 1.05,
            ease: "power2.inOut",
            onUpdate: update,
          });
          const x = gsap.quickTo(pose, "x", {
            duration: 0.38,
            ease: "power2.out",
            onUpdate: update,
          });
          const y = gsap.quickTo(pose, "y", {
            duration: 0.38,
            ease: "power2.out",
            onUpdate: update,
          });
          host.addEventListener(
            "pointermove",
            (event) => {
              if (event.pointerType !== "mouse") return;
              const rect = host.getBoundingClientRect();
              x(((event.clientY - rect.top) / rect.height - 0.5) * 0.1);
              y(((event.clientX - rect.left) / rect.width - 0.5) * 0.16);
            },
            { signal: events.signal },
          );
          host.addEventListener(
            "pointerleave",
            () => {
              x(0);
              y(0);
            },
            { signal: events.signal },
          );
        }
        update();
        return () => {
          events.abort();
          pose.x = pose.y = 0;
          pose.spread = 1;
          update();
        };
      },
      host,
    );
  } catch {
    dispose();
  }
  return dispose;
}
