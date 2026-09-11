"use client";

import { useEffect, useRef, useState } from "react";

function decimalPlaces(value: number): number {
  const [, fraction = ""] = String(value).split(".");
  return Math.min(fraction.length, 2);
}

function formatValue(value: number, places: number): string {
  return places === 0 ? String(Math.round(value)) : value.toFixed(places);
}

export function AnimatedRatingValue({ value }: Readonly<{ value: number }>) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const [displayValue, setDisplayValue] = useState(0);
  const places = decimalPlaces(value);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    hasAnimatedRef.current = false;

    function cancelFrame(): void {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hasAnimatedRef.current = true;
      frameRef.current = window.requestAnimationFrame(() => {
        setDisplayValue(value);
        frameRef.current = null;
      });
      return cancelFrame;
    }

    function startAnimation(): void {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;
      const startedAt = performance.now();
      const duration = 900;

      function update(now: number): void {
        const progress = Math.min(1, (now - startedAt) / duration);
        const easedProgress = 1 - (1 - progress) ** 3;
        setDisplayValue(value * easedProgress);

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(update);
        } else {
          setDisplayValue(value);
          frameRef.current = null;
        }
      }

      frameRef.current = window.requestAnimationFrame(update);
    }

    if (!("IntersectionObserver" in window)) {
      startAnimation();
      return cancelFrame;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          startAnimation();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelFrame();
    };
  }, [value]);

  return (
    <span ref={elementRef} className="tabular-nums">
      <span aria-hidden="true">{formatValue(displayValue, places)}</span>
      <span className="sr-only">{formatValue(value, places)}</span>
    </span>
  );
}
