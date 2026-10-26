"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/products/product-image";
import type { OrbitItem } from "./orbit-hero";

/**
 * Size, stacking and label keyframes for `n` items. Each item gets a 3 s slot of a
 * 3n-second lap; the times it grows in, holds big and shows its label are kept in
 * seconds (tuned for four items), so a different number of categories never shows
 * two labels at once. Shrinking and fading stay tied to the far side of the ring.
 */
function cycleKeyframes(n: number) {
  const f = Math.min(4 / n, 1.3);
  const p = (v: number) => `${+(v * f).toFixed(2)}%`;
  return `
@keyframes orbit-size-${n} {
  0% { opacity: 0; transform: scale(0.2); visibility: hidden; }
  ${p(5)} { opacity: 1; transform: scale(1.3); visibility: visible; }
  ${p(24)} { opacity: 1; transform: scale(1.3); }
  70% { opacity: 1; transform: scale(0.5); visibility: visible; }
  90% { opacity: 0; transform: scale(0.3); visibility: hidden; }
  100% { opacity: 0; transform: scale(0.2); visibility: hidden; }
}
@keyframes orbit-z-${n} {
  0%, ${p(28)} { z-index: 9; }
  ${p(28.01)}, 100% { z-index: 2; }
}
@keyframes orbit-label-${n} {
  0% { opacity: 0; transform: translateY(14px); visibility: hidden; }
  ${p(4)} { opacity: 1; transform: translateY(0); visibility: visible; }
  ${p(23)} { opacity: 1; transform: translateY(0); visibility: visible; }
  ${p(27)}, 100% { opacity: 0; transform: translateY(-14px); visibility: hidden; }
}`;
}

const isCycle = (name: string) => /^orbit-(travel|z|size|label)/.test(name);

/**
 * Lines every cycle animation up on one clock. Items and labels pause and resume
 * together, but a throttled tab can let compositor and main-thread animations drift,
 * which would put the wrong name in the centre disc.
 */
function resync(stage: HTMLElement | null) {
  const anims = stage?.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation && isCycle(a.animationName));
  const time = anims?.[0]?.currentTime;
  if (time == null) return;
  for (const a of anims!) a.currentTime = time;
}

/**
 * The 640×760 orbit stage. All motion is CSS; this component writes the timing for
 * the number of items and sets data-paused while the stage is off screen or the
 * tab is hidden, and on a touch press so the item under the finger stops moving
 * before the tap lands.
 */
export function OrbitStage({ items }: { items: OrbitItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [touched, setTouched] = useState(false);
  const resume = useRef<number>(undefined);
  const n = items.length;

  useEffect(() => () => window.clearTimeout(resume.current), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    io.observe(el);
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const paused = offscreen || hidden || touched;
  useEffect(() => {
    if (!paused) resync(ref.current);
  }, [paused]);

  return (
    <div className="orbit-frame mx-auto mt-10 lg:mt-0 lg:shrink-0">
      <style>{cycleKeyframes(n)}</style>
      <div
        ref={ref}
        className="orbit-stage"
        data-paused={paused || undefined}
        style={{ "--n": n } as React.CSSProperties}
        onPointerLeave={() => resync(ref.current)}
        onBlur={() => resync(ref.current)}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          setTouched(true);
          // A tap on empty stage space should not freeze the orbit for good.
          window.clearTimeout(resume.current);
          resume.current = window.setTimeout(() => setTouched(false), 4000);
        }}
      >
        <div className="orbit-ring" aria-hidden />
        <div className="orbit-ring-outer" aria-hidden>
          <span className="orbit-ring-dot" />
        </div>

        <div className="orbit-disc">
          {items.map((c, k) => (
            <Link
              key={c.slug}
              href={c.href}
              className="orbit-label orbit-focus"
              style={{ "--k": k, animationName: `orbit-label-${n}` } as React.CSSProperties}
              aria-label={c.label}
            >
              <span className="text-[13px] font-semibold tracking-[0.24em] uppercase opacity-85">{c.eyebrow}</span>
              <span className="display mt-1 text-[34px] leading-[1.02]">{c.name}</span>
              <span className="mt-2 text-[13px] font-medium opacity-85">
                Shop now <span aria-hidden>»</span>
              </span>
            </Link>
          ))}
        </div>

        {items.map((c, k) => (
          <div key={c.slug} className="orb" style={{ "--k": k, animationName: `orbit-travel, orbit-z-${n}` } as React.CSSProperties}>
            <Link href={c.href} className="orb-link orbit-focus" style={{ animationName: `orbit-size-${n}` }} aria-label={c.label}>
              <span className="orb-hover">
                <span className="relative block size-[150px] overflow-hidden rounded-full bg-card shadow-[0_12px_30px_-12px_rgb(0_0_0/0.35)] ring-4 ring-white">
                  <ProductImage src={c.image} alt="" fill sizes="200px" loading="eager" draggable={false} className="select-none" />
                </span>
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
