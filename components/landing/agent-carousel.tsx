"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface AgentCarouselProps {
  children: ReactNode;
  live: boolean;
}

const AUTO_ADVANCE_INTERVAL_MS = 5_000;

export function AgentCarousel({ children, live }: AgentCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const updatePosition = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    setAtStart(viewport.scrollLeft <= 1);
    setAtEnd(
      viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [updatePosition]);

  const move = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const firstCard = viewport.firstElementChild;
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 320;
    viewport.scrollBy({
      behavior: "smooth",
      left: direction * (cardWidth + 16),
    });
  }, []);

  const advance = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return;

    const hasReachedEnd =
      viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1;

    if (hasReachedEnd) {
      viewport.scrollTo({ behavior: "smooth", left: 0 });
      return;
    }

    move(1);
  }, [move]);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const updateMotionPreference = () =>
      setPrefersReducedMotion(motionPreference.matches);

    updateMotionPreference();
    motionPreference.addEventListener("change", updateMotionPreference);

    return () =>
      motionPreference.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;

    const interval = window.setInterval(advance, AUTO_ADVANCE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [advance, isPaused, prefersReducedMotion]);

  return (
    <div
      className="mt-9"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-foreground">
            Agent showcase
          </p>
          {live ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <span
                className="size-1.5 rounded-full bg-emerald-300"
                aria-hidden="true"
              />
              Live index
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2" aria-label="Carousel controls">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={atStart}
            aria-label="Show previous agents"
            className="grid size-9 place-items-center rounded-full border border-border bg-background text-foreground outline-none transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={atEnd}
            aria-label="Show more agents"
            className="grid size-9 place-items-center rounded-full border border-border bg-background text-foreground outline-none transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        onScroll={updatePosition}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onTouchCancel={() => setIsPaused(false)}
        role="region"
        aria-label="Featured agents"
        aria-roledescription="carousel"
        tabIndex={0}
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30 [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {children}
      </div>
      <p className="sr-only">
        This carousel advances by one agent every five seconds and pauses while
        you interact with it.
      </p>
    </div>
  );
}
