import React, { useEffect, useRef } from "react";
export default function MagneticButton({
  href,
  onClick,
  children,
  className = "button",
}) {
  const button = useRef(null),
    visual = useRef(null);
  useEffect(() => {
    const node = button.current,
      inner = visual.current;
    const media = matchMedia(
      "(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)",
    );
    let raf = 0;
    const move = (e) => {
      if (!media.matches || e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = node.getBoundingClientRect();
        const x = Math.max(
            -8,
            Math.min(8, (e.clientX - box.left - box.width / 2) * 0.12),
          ),
          y = Math.max(
            -8,
            Math.min(8, (e.clientY - box.top - box.height / 2) * 0.12),
          );
        inner.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      inner.style.transform = "translate3d(0,0,0)";
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", reset);
    node.addEventListener("focus", reset);
    media.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
      node.removeEventListener("focus", reset);
      media.removeEventListener("change", reset);
    };
  }, []);
  return (
    <a ref={button} href={href} onClick={onClick} className={className + " magnetic-button"}>
      <span ref={visual}>{children}</span>
    </a>
  );
}
