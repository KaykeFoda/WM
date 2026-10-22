import React, { useEffect, useRef } from 'react';

// Decorative only: scroll updates a CSS variable without React re-renders.
export default function BarberDecor() {
  const razor = useRef(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let previous = window.scrollY;
    let angle = 0;
    let frame = 0;
    const update = () => {
      const current = window.scrollY;
      const delta = current - previous;
      previous = current;
      if (!motion.matches) angle = Math.max(0, Math.min(110, angle + delta * 0.35));
      else angle = 35;
      razor.current?.style.setProperty('--blade-angle', `${-angle}deg`);
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onMotion = () => { previous = window.scrollY; update(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    motion.addEventListener('change', onMotion);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      motion.removeEventListener('change', onMotion);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="barber-decor" aria-hidden="true">
    <div className="barber-pole">
      <div className="pole-finial"/><div className="pole-cap pole-cap-top"/>
      <div className="pole-glass"><div className="pole-stripes"/></div>
      <div className="pole-cap pole-cap-bottom"/><div className="pole-finial pole-finial-bottom"/>
    </div>
    <div className="scroll-razor" ref={razor}>
      <svg viewBox="0 0 180 200" fill="none">
        <defs><linearGradient id="razor-steel" x1="35" y1="30" x2="60" y2="165" gradientUnits="userSpaceOnUse"><stop stopColor="#faf5df"/><stop offset=".45" stopColor="#9caaa9"/><stop offset=".55" stopColor="#edf0e7"/><stop offset="1" stopColor="#8c927e"/></linearGradient></defs>
        <path d="M44 171C30 162 32 135 34 108L40 38Q42 25 51 28L56 33 58 132Q60 164 50 173Z" fill="#24291e" stroke="#D3AF37" strokeWidth="2"/>
        <path d="M43 145 47 45" stroke="#8c773e" strokeWidth="2"/>
        <g className="razor-blade">
          <path d="M48 165 43 134 39 48Q38 29 49 24L68 28 71 118Q70 139 54 150L53 165Z" fill="url(#razor-steel)" stroke="#777f71" strokeWidth="1.5"/>
          <path d="M62 35 64 116Q63 131 53 139" stroke="#fff" strokeOpacity=".8" strokeWidth="2"/>
          <path d="M49 150 48 163" stroke="#D3AF37" strokeWidth="5"/>
        </g>
        <circle cx="48" cy="165" r="5" fill="#D3AF37" stroke="#736137" strokeWidth="2"/>
      </svg>
    </div>
  </div>;
}
