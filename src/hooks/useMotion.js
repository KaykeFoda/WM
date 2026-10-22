import { useEffect } from "react";
const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
const frames = {
  rotation: [
    { opacity: 0, transform: "rotate(-8deg) scale(.96)" },
    { opacity: 1, transform: "rotate(0deg) scale(1)" },
  ],
  zoom: [
    { opacity: 0, transform: "scale(.92)" },
    { opacity: 1, transform: "scale(1)" },
  ],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  left: [
    { opacity: 0, transform: "translateX(-28px)" },
    { opacity: 1, transform: "translateX(0)" },
  ],
  right: [
    { opacity: 0, transform: "translateX(28px)" },
    { opacity: 1, transform: "translateX(0)" },
  ],
  stagger: [
    { opacity: 0, transform: "translateY(18px)" },
    { opacity: 1, transform: "translateY(0)" },
  ],
  split: [
    { opacity: 0, transform: "translateY(100%)" },
    { opacity: 1, transform: "translateY(0)" },
  ],
  mask: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
  morph: [
    {
      clipPath:
        "polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%)",
    },
    {
      clipPath:
        "polygon(50% 0%,75% 25%,100% 50%,75% 75%,50% 100%,25% 75%,0% 50%,25% 25%)",
    },
    {
      clipPath:
        "polygon(0% 0%,75% 0%,100% 25%,75% 50%,100% 100%,25% 100%,0% 75%,25% 50%)",
    },
  ],
};
const durations = {
  rotation: 650,
  zoom: 550,
  fade: 450,
  left: 600,
  right: 600,
  stagger: 450,
  split: 600,
  mask: 750,
  morph: 900,
  path: 1200,
};
export default function useMotion(page) {
  useEffect(() => {
    if (page !== "home") return;
    const root = document.querySelector("main");
    if (!root) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet();
    const active = new Map();
    let observer, mutations;
    let disposed = false;
    function finish(node) {
      const animation = active.get(node);
      if (animation) {
        animation.cancel();
        active.delete(node);
      }
    }
    function run(node, replay = false) {
      if (
        !node ||
        reduced.matches ||
        !node.animate ||
        node.contains(document.activeElement)
      )
        return;
      if (!replay && seen.has(node)) return;
      seen.add(node);
      finish(node);
      const type = node.dataset.motion;
      let keyframes = frames[type];
      if (type === "path") {
        const box = node.parentElement.getBoundingClientRect(),
          w = Math.max(100, box.width),
          h = Math.max(60, box.height);
        if (CSS.supports("offset-path", `path('M 0 0 L 1 1')`)) {
          node.style.offsetPath = `path('M ${w * 0.06} ${h * 0.8} C ${w * 0.3} ${-h * 0.1},${w * 0.7} ${h * 1.1},${w * 0.94} ${h * 0.18}')`;
          node.style.offsetDistance = "100%";
          keyframes = [
            { opacity: 0, offsetDistance: "0%" },
            { opacity: 1, offsetDistance: "15%", offset: 0.15 },
            { opacity: 1, offsetDistance: "100%" },
          ];
        } else
          keyframes = [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "translateY(0)" },
          ];
      }
      if (
        ["mask", "morph"].includes(type) &&
        !CSS.supports("clip-path", "inset(0)")
      )
        return;
      if (!keyframes) return;
      try {
        const delay = Math.min(
          Number(node.dataset.delay) || 0,
          ["stagger", "split"].includes(type) ? 480 : 240,
        );
        const animation = node.animate(keyframes, {
          duration: durations[type] || 450,
          delay,
          easing:
            type === "fade"
              ? "ease-out"
              : type === "mask"
                ? "cubic-bezier(.76,0,.24,1)"
                : type === "morph"
                  ? "ease-in-out"
                  : easing,
          fill: "none",
        });
        active.set(node, animation);
        animation.onfinish = () => active.delete(node);
        animation.oncancel = () => active.delete(node);
      } catch {
        finish(node);
      }
    }
    function register(scope) {
      scope.querySelectorAll?.("[data-motion]").forEach((node) => {
        if (!seen.has(node)) observer?.observe(node);
      });
    }
    function setup() {
      if (
        reduced.matches ||
        document.body.style.overflow === "hidden" ||
        !("IntersectionObserver" in window)
      )
        return;
      try {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
                observer.unobserve(entry.target);
                if (entry.target.dataset.stagger !== undefined) {
                  const items = [...entry.target.children];
                  items.forEach((node, i) => {
                    if (!node.dataset.motion) {
                      node.dataset.motion = "stagger";
                      node.dataset.delay = String(Math.min(i * 80, 480));
                    }
                    run(node);
                  });
                } else run(entry.target);
              }
            }
          },
          { threshold: [0, 0.2] },
        );
        register(root);
        root
          .querySelectorAll("[data-stagger]")
          .forEach((node) => observer.observe(node));
        mutations = new MutationObserver((records) => {
          for (const r of records)
            for (const added of r.addedNodes) {
              if (added.nodeType !== 1) continue;
              if (added.matches("[data-motion]")) observer.observe(added);
              register(added);
              if (added.parentElement?.matches("[data-stagger]")) {
                added.dataset.motion = "stagger";
                added.dataset.delay = "0";
                observer.observe(added);
              }
            }
        });
        mutations.observe(root, { childList: true, subtree: true });
      } catch {
        observer?.disconnect();
        active.forEach((a) => a.cancel());
        active.clear();
      }
    }
    function focus(e) {
      for (const [node] of active) if (node.contains(e.target)) finish(node);
    }
    function change() {
      observer?.disconnect();
      mutations?.disconnect();
      observer = undefined;
      active.forEach((a) => a.cancel());
      active.clear();
      if (!disposed) setup();
    }
    function replay(e) {
      if (e.target instanceof Element) run(e.target, true);
    }
    const modalChanges = new MutationObserver(() => {
      if (document.body.style.overflow === "hidden") {
        active.forEach((animation) => animation.cancel());
        active.clear();
      } else if (!observer && !disposed) setup();
    });
    modalChanges.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    const pathResize =
      "ResizeObserver" in window
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              const node = entry.target.querySelector('[data-motion="path"]');
              if (!node || !CSS.supports("offset-path", `path('M 0 0 L 1 1')`))
                continue;
              const w = entry.contentRect.width,
                h = entry.contentRect.height;
              node.style.offsetPath = `path('M ${w * 0.06} ${h * 0.8} C ${w * 0.3} ${-h * 0.1},${w * 0.7} ${h * 1.1},${w * 0.94} ${h * 0.18}')`;
              node.style.offsetDistance = "100%";
            }
          })
        : null;
    root
      .querySelectorAll(".hero-path")
      .forEach((node) => pathResize?.observe(node));
    setup();
    root.addEventListener("focusin", focus);
    root.addEventListener("nex:replay-motion", replay);
    reduced.addEventListener("change", change);
    return () => {
      disposed = true;
      modalChanges.disconnect();
      pathResize?.disconnect();
      observer?.disconnect();
      mutations?.disconnect();
      active.forEach((a) => a.cancel());
      root.removeEventListener("focusin", focus);
      root.removeEventListener("nex:replay-motion", replay);
      reduced.removeEventListener("change", change);
    };
  }, [page]);
}
