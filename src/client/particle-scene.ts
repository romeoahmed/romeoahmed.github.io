import {
  addToScene,
  createPlane,
  createEngine,
  createFreeCamera,
  createSceneContext,
  createShaderMaterial,
  disposeEngine,
  disposeScene,
  enableAsyncShaderPipelineCompilation,
  enableDeviceLostSceneRecovery,
  enableOrthographicCamera,
  registerScene,
  renderFrame,
  resizeEngine,
  setShaderVector3,
  setShaderFloat,
  setThinInstances,
  setThinInstanceColors,
  type DeviceLostRecoveryHandle,
  type EngineContext,
  type SceneContext,
} from "@babylonjs/lite";
import { gsap } from "gsap";
import { cssColorToLinear } from "../lib/color";
import { createParticleField } from "../lib/particle-field";

const varyings = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) light: f32,
  @location(2) opacity: f32,
}`;

function particleMaterial() {
  return createShaderMaterial({
    vertexSource: `${varyings}
      @vertex fn mainVertex(input: VertexInput) -> VertexOutput {
        var center = (shaderSystem.world * input.world3).xyz;
        center *= shaderUniforms.spread;
        let delta = center.xy - shaderUniforms.pointer.xy;
        let distanceSquared = dot(delta, delta);
        let influence = exp(-distanceSquared * 2.2) * shaderUniforms.pointer.z;
        let direction = delta * inverseSqrt(max(distanceSquared, 0.04));
        center += vec3f(
          (direction * 0.28 + vec2f(-direction.y, direction.x) * 0.12) * influence,
          -0.22 * influence,
        );
        // Face quads toward the camera so field rotation does not flatten the particles.
        // Keep a two-pixel minimum diameter across the five-unit camera height.
        let size = max(input.world0.x, 10.0 / shaderSystem.screenSize.y)
          * (1.0 + influence * 0.35);
        let position = center + vec3f(input.position.xy * size, 0.0);
        return VertexOutput(
          shaderSystem.viewProjection * vec4f(position, 1.0),
          input.uv * 2.0 - 1.0,
          smoothstep(-1.5, 1.5, -center.z) * 0.65 + influence * 0.2,
          input.instanceColor.a,
        );
      }`,
    fragmentSource: `${varyings}
      @fragment fn mainFragment(input: VertexOutput) -> @location(0) vec4f {
        let radius = length(input.uv);
        let edge = max(fwidth(radius), 0.08);
        let coverage = 1.0 - smoothstep(1.0 - edge, 1.0, radius);
        let color = mix(shaderUniforms.accent, shaderUniforms.ink, input.light);
        return vec4f(color, coverage * input.opacity);
      }`,
    attributes: ["position", "uv"],
    uniforms: [
      "world",
      "viewProjection",
      "screenSize",
      { name: "accent", type: "vec3<f32>" },
      { name: "ink", type: "vec3<f32>" },
      { name: "pointer", type: "vec3<f32>" },
      { name: "spread", type: "f32", defaultValue: 1 },
    ],
    needAlphaBlending: true,
  });
}

/**
 * Renders the particle field on demand, retaining the SVG until the first frame.
 *
 * @param signal - Page lifetime; releases initialization results that arrive after cancellation.
 * @returns Releases GPU resources, observers, and animations.
 */
export async function mountParticleScene(
  host: HTMLElement,
  signal: AbortSignal,
) {
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
    // Enable recovery before creating geometry so Lite can rebuild it after device loss.
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
    const background = { r: 0, g: 0, b: 0, a: 1 };
    scene.clearColor = background;
    const camera = createFreeCamera(
      { x: 0, y: 0, z: -8 },
      { x: 0, y: 0, z: 0 },
    );
    const bounds = enableOrthographicCamera(camera);
    scene.camera = camera;
    const material = particleMaterial();
    const particles = createParticleField(1800);
    const mesh = createPlane(gpu);
    mesh.material = material;
    const matrices = new Float32Array(particles.length * 16);
    const colors = new Float32Array(particles.length * 4);
    particles.forEach(({ x, y, z, size, opacity }, i) => {
      matrices.set(
        [size, 0, 0, 0, 0, size, 0, 0, 0, 0, size, 0, x, y, z, 1],
        i * 16,
      );
      colors.set([1, 1, 1, opacity], i * 4);
    });
    setThinInstances(mesh, matrices, particles.length);
    setThinInstanceColors(mesh, colors);
    addToScene(scene, mesh);
    const syncColor = () => {
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) =>
        cssColorToLinear(css.getPropertyValue(`--color-${name}`));
      const [r, g, b] = color("page");
      Object.assign(background, { r, g, b });
      setShaderVector3(material, "accent", color("accent"));
      setShaderVector3(material, "ink", color("text"));
      invalidate();
    };
    const size = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      resizeEngine(gpu);
      bounds.left = (-2.5 * width) / height;
      bounds.right = -bounds.left;
      bounds.top = 2.5;
      bounds.bottom = -2.5;
      invalidate();
    };
    size();
    await registerScene(scene);
    if (disposed) return dispose;
    ready = true;
    syncColor();
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
        const pose = { x: 0, y: 0, strength: 0, spread: 1 };
        const update = () => {
          mesh.rotation.set(-pose.y * 0.045, pose.x * 0.08, 0);
          setShaderVector3(material, "pointer", [
            pose.x,
            pose.y,
            pose.strength,
          ]);
          setShaderFloat(material, "spread", pose.spread);
          invalidate();
        };
        if (animate) {
          gsap.from(pose, {
            spread: 1.12,
            duration: 0.95,
            ease: "power2.out",
            onUpdate: update,
          });
          const follow = (property: "x" | "y" | "strength") =>
            gsap.quickTo(pose, property, {
              duration: property === "strength" ? 0.72 : 0.52,
              ease: "power3.out",
              onUpdate: update,
            });
          const x = follow("x"),
            y = follow("y"),
            strength = follow("strength");
          const reset = () => {
            x(0);
            y(0);
            strength(0);
          };
          const point = (event: PointerEvent) => {
            if (!event.isPrimary || document.hidden || !visible) return;
            const rect = host.getBoundingClientRect();
            x(
              (((event.clientX - rect.left) / rect.width) * 2 - 1) *
                ((2.5 * rect.width) / rect.height),
            );
            y((1 - ((event.clientY - rect.top) / rect.height) * 2) * 2.5);
            strength(1 + event.pressure * 0.35);
          };
          const options = { signal: events.signal, passive: true };
          host.addEventListener("pointermove", point, options);
          host.addEventListener("pointerdown", point, options);
          host.addEventListener("pointerleave", reset, options);
          host.addEventListener("pointercancel", reset, options);
          host.addEventListener(
            "pointerup",
            (event) => {
              if (event.pointerType !== "mouse") reset();
              else strength(1);
            },
            options,
          );
          window.addEventListener("blur", reset, options);
        }
        update();
        return () => {
          events.abort();
          pose.x = pose.y = pose.strength = 0;
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
