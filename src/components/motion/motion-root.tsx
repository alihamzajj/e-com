"use client";

import { useEffect } from "react";

/**
 * Enables entrance animations and reveals [data-reveal] elements as they
 * scroll into view. Does nothing for visitors who prefer reduced motion, so
 * their content is simply shown. Streamed-in sections are picked up through a
 * MutationObserver.
 */
export function MotionRoot() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("motion-ready") || !("IntersectionObserver" in window)) {
      root.classList.remove("motion-ready");
      return;
    }
    root.classList.add("motion-live");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-shown", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const watch = (scope: ParentNode) => {
      scope.querySelectorAll("[data-reveal]:not([data-shown]), [data-reveal-words]:not([data-shown])").forEach((el) => {
        // Already on screen at load: show without waiting for a scroll.
        observer.observe(el);
      });
    };

    watch(document);

    // A fast scroll or jump (End key, anchor link) can carry an element past the
    // viewport without it ever "intersecting"; reveal anything already above
    // the bottom of the screen so nothing is left hidden.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      const limit = window.innerHeight;
      document.querySelectorAll("[data-reveal]:not([data-shown]), [data-reveal-words]:not([data-shown])").forEach((el) => {
        if (el.getBoundingClientRect().top < limit) {
          el.setAttribute("data-shown", "");
          observer.unobserve(el);
        }
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            if (node.matches("[data-reveal], [data-reveal-words]")) observer.observe(node);
            watch(node);
          }
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
