"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/products/product-image";
import { ORBIT_OUTER } from "@/features/catalog/home-orbit";

export type OrbitProduct = { id: string; name: string; category: string; price: string; href: string; image: string | null };

const OUTER_RADIUS = 42; // % of the stage width
const INNER_RADIUS = 26;
const CYCLE_MS = 3200;

/** Positions `count` bubbles evenly round a ring, starting at the top (plus an optional turn). */
function ringPosition(k: number, count: number, radius: number, offset = 0) {
  const angle = -Math.PI / 2 + offset + (k / count) * Math.PI * 2;
  return { left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%` };
}

/**
 * Two rings of product bubbles (outer clockwise, inner the other way) around an
 * orange centre that shows one product at a time with its price. The centre moves
 * on every 3.2 s; tapping a bubble shows it at once and restarts the timer.
 * Spinning and pausing on hover are CSS (globals.css, "Product orbit hero").
 */
export function ProductOrbit({ products }: { products: OrbitProduct[] }) {
  const [active, setActive] = useState(0);
  const timer = useRef<number>(undefined);
  const outer = products.slice(0, ORBIT_OUTER);
  const inner = products.slice(ORBIT_OUTER);
  const current = products[active];

  const restart = useCallback(() => {
    window.clearInterval(timer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive((i) => (i + 1) % products.length), CYCLE_MS);
  }, [products.length]);

  useEffect(() => {
    restart();
    return () => window.clearInterval(timer.current);
  }, [restart]);

  const bubble = (p: OrbitProduct, index: number, ring: "outer" | "inner", style: React.CSSProperties) => (
    <div key={p.id} className={`porb-slot porb-slot-${ring}`} style={style}>
      <button
        type="button"
        className="porb-bubble"
        data-active={index === active || undefined}
        aria-pressed={index === active}
        aria-label={`Show ${p.name}, ${p.price}`}
        onClick={() => {
          setActive(index);
          restart();
        }}
      >
        <span className="porb-upright">
          <span className="relative block size-full overflow-hidden rounded-full">
            <ProductImage src={p.image} alt="" fill sizes="120px" loading="eager" draggable={false} className="select-none" />
          </span>
        </span>
      </button>
    </div>
  );

  return (
    <div className="porb mx-auto mt-10 w-full max-w-[600px] lg:mt-0">
      <div className="porb-guide" style={{ width: `${OUTER_RADIUS * 2}%` }} aria-hidden />
      {inner.length > 0 ? <div className="porb-guide" style={{ width: `${INNER_RADIUS * 2}%` }} aria-hidden /> : null}

      <div className="porb-ring porb-ring-outer">
        {outer.map((p, k) => bubble(p, k, "outer", ringPosition(k, outer.length, OUTER_RADIUS)))}
      </div>
      {inner.length > 0 ? (
        <div className="porb-ring porb-ring-inner">
          {inner.map((p, k) => bubble(p, ORBIT_OUTER + k, "inner", ringPosition(k, inner.length, INNER_RADIUS, Math.PI / 3)))}
        </div>
      ) : null}

      <div className="porb-core" aria-live="polite" aria-atomic="true">
        <Link key={current.id} href={current.href} className="porb-core-inner orbit-focus">
          <span className="relative block aspect-square w-[40%] overflow-hidden rounded-full bg-white ring-4 ring-white/70">
            <ProductImage src={current.image} alt="" fill sizes="160px" />
          </span>
          <span className="porb-cat display mt-[5%]" style={{ "--len": Math.max(current.category.length, 6) } as React.CSSProperties}>
            {current.category}
          </span>
          <span className="mt-1 line-clamp-1 max-w-full px-2 text-[11px] font-medium opacity-90 sm:text-xs">{current.name}</span>
          <span className="mt-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-accent-strong tabular-nums sm:text-[13px]">
            {current.price}
          </span>
        </Link>
      </div>

      <div className="porb-tag" aria-hidden>
        <span className="text-xs font-medium opacity-75">{current.name}</span>
        <span className="text-lg font-extrabold tabular-nums">{current.price}</span>
      </div>
    </div>
  );
}
