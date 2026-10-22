import { useEffect } from "react";
export default function useScrollEffects(page) {
  useEffect(() => {
    if (page !== "home") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia(
      "(min-width: 900px) and (hover: hover) and (pointer: fine)",
    );
    let lenis,
      raf = 0,
      disposed = false,
      initializing = false;
    const layers = [...document.querySelectorAll("[data-parallax]")];
    let dirty = true;
    function update() {
      if (!dirty) return;
      dirty = false;
      for (const layer of layers) {
        const rect = layer.parentElement.getBoundingClientRect();
        const p = Math.max(
          0,
          Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)),
        );
        const limit = Math.min(36, Number(layer.dataset.parallax) || 12);
        layer.style.setProperty("--parallax-y", `${(p - 0.5) * limit * 2}px`);
      }
    }
    function loop(time) {
      if (disposed) return;
      lenis?.raf(time);
      update();
      raf = requestAnimationFrame(loop);
    }
    function scroll() {
      dirty = true;
    }
    function lock() {
      if (document.body.style.overflow === "hidden") lenis?.stop();
      else lenis?.start();
    }
    const locks = new MutationObserver(lock);
    locks.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    async function setup() {
      if (reduced.matches || !desktop.matches) {
        lenis?.destroy();
        lenis = null;
        cancelAnimationFrame(raf);
        raf = 0;
        layers.forEach((l) => l.style.removeProperty("--parallax-y"));
        return;
      }
      if (initializing) return;
      if (!raf) raf = requestAnimationFrame(loop);
      if (lenis) return;
      initializing = true;
      try {
        const { default: Lenis } = await import("lenis");
        if (disposed || reduced.matches || !desktop.matches) return;
        lenis = new Lenis({
          lerp: 0.1,
          smoothWheel: true,
          syncTouch: false,
          anchors: true,
          prevent: (node) =>
            !!node.closest?.(
              "[data-lenis-prevent],.modal-overlay,.leaflet-container,textarea,pre,.prompt-index,.manager-list",
            ),
        });
        lock();
      } catch {
        lenis?.destroy();
        lenis = null;
      } finally {
        initializing = false;
      }
    }
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    reduced.addEventListener("change", setup);
    desktop.addEventListener("change", setup);
    setup();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      locks.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      reduced.removeEventListener("change", setup);
      desktop.removeEventListener("change", setup);
      layers.forEach((l) => l.style.removeProperty("--parallax-y"));
    };
  }, [page]);
}
