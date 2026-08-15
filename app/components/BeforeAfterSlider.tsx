"use client";

import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";

type BeforeAfterSliderProps = {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  initialPosition?: number;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export default function BeforeAfterSlider({
  before,
  after,
  beforeAlt,
  afterAlt,
  initialPosition = 50,
  beforeLabel = "Antes",
  afterLabel = "Después",
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isAnimating, setIsAnimating] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const hasInteractedRef = useRef(false);
  const hasAnimatedRef = useRef(false);

  const clearAnimation = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    setIsAnimating(false);
  }, []);

  const cancelAnimation = useCallback(() => {
    hasInteractedRef.current = true;
    clearAnimation();
  }, [clearAnimation]);

  const setPositionFromPointer = useCallback((clientX: number) => {
    const bounds = sliderRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition(clamp(((clientX - bounds.left) / bounds.width) * 100));
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasAnimatedRef.current || hasInteractedRef.current) return;
      hasAnimatedRef.current = true;
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      const sequence = mobile ? [40, 62, 50] : [35, 68, 50];
      setIsAnimating(true);
      sequence.forEach((nextPosition, index) => {
        timersRef.current.push(window.setTimeout(() => {
          if (hasInteractedRef.current) return;
          setPosition(nextPosition);
          if (index === sequence.length - 1) setIsAnimating(false);
        }, 180 + index * 900));
      });
      observer.disconnect();
    }, { threshold: 0.45 });

    observer.observe(slider);
    return () => {
      observer.disconnect();
      clearAnimation();
    };
  }, [clearAnimation]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    cancelAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPositionFromPointer(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setPositionFromPointer(event.clientX);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const values: Record<string, number> = {
      ArrowLeft: position - step,
      ArrowRight: position + step,
      Home: 0,
      End: 100,
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    cancelAnimation();
    setPosition(clamp(values[event.key]));
  };

  return (
    <div
      ref={sliderRef}
      className={`before-after-slider${isAnimating ? " is-animating" : ""} ${className}`.trim()}
      role="slider"
      tabIndex={0}
      aria-label="Comparación antes y después del soporte Garden World Roll Up"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)}% antes visible`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelAnimation}
      onPointerCancel={cancelAnimation}
      onKeyDown={handleKeyDown}
    >
      <img className="before-after-image" src={after} alt={afterAlt} decoding="async" />
      <img className="before-after-image before-after-before" src={before} alt={beforeAlt} decoding="async" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />
      <span className="before-after-label before-after-label-before">{beforeLabel}</span>
      <span className="before-after-label before-after-label-after">{afterLabel}</span>
      <span className="before-after-divider" style={{ left: `${position}%` }} aria-hidden="true">
        <span className="before-after-handle"><span>‹</span><span>›</span></span>
      </span>
    </div>
  );
}
