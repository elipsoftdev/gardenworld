"use client";

import { TouchEvent, useCallback, useEffect, useRef, useState } from "react";

export type ProductGalleryImage = {
  src: string;
  alt: string;
  label: string;
  fit: "contain" | "cover";
};

type ProductGalleryProps = {
  productName: string;
  images: ProductGalleryImage[];
};

const AUTOPLAY_DELAY = 3000;
const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export default function ProductGallery({ productName, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoplayCycle, setAutoplayCycle] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);

  const moveBy = useCallback((step: number) => {
    setActiveIndex((currentIndex) => (currentIndex + step + images.length) % images.length);
  }, [images.length]);

  const selectImage = (index: number) => {
    setActiveIndex(index);
    setAutoplayCycle((current) => current + 1);
  };

  const pauseForTouch = () => {
    setIsPaused(true);
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
  };

  const resumeAfterTouch = () => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setIsPaused(false), 700);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion || isPaused || isModalOpen || images.length < 2) return;
    const interval = window.setInterval(() => moveBy(1), AUTOPLAY_DELAY);
    return () => window.clearInterval(interval);
  }, [autoplayCycle, images.length, isModalOpen, isPaused, moveBy, reducedMotion]);

  useEffect(() => () => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousFocusedElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsModalOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBy(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveBy(1);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusedElement?.focus();
    };
  }, [isModalOpen, moveBy]);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    pauseForTouch();
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchStartX.current !== null && endX !== undefined) {
      const distance = endX - touchStartX.current;
      if (Math.abs(distance) > 45) moveBy(distance > 0 ? -1 : 1);
    }
    touchStartX.current = null;
    resumeAfterTouch();
  };

  const activeImage = images[activeIndex] ?? images[0];
  if (!activeImage) return null;

  return <>
    <div
      className="product-media"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resumeAfterTouch}
    >
      <div className="finish-image">
        <button className="product-main-image-button" type="button" onClick={() => setIsModalOpen(true)} aria-label={"Ampliar " + activeImage.label + " de " + productName}>
          <img key={activeImage.src} src={activeImage.src} alt={activeImage.alt} className={"is-active product-main-image product-main-image-" + activeImage.fit} decoding="async" />
          <span className="product-zoom-indicator" aria-hidden="true">⌕</span>
        </button>
        <span className="finish-counter" aria-live="polite">{activeImage.label}</span>
      </div>
      <div className="product-gallery" aria-label={"Galería de " + productName}>
        {images.map((image, index) => <button type="button" key={image.src} className={index === activeIndex ? "is-active" : ""} aria-label={"Ver " + image.label + " de " + productName} aria-pressed={index === activeIndex} onClick={() => selectImage(index)}><img src={image.src} alt="" loading="lazy" decoding="async" /></button>)}
      </div>
    </div>

    {isModalOpen && <div className="product-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false); }}>
      <div ref={dialogRef} className="product-lightbox-dialog" role="dialog" aria-modal="true" aria-label={"Vista ampliada de " + productName}>
        <button ref={closeButtonRef} className="lightbox-close" type="button" onClick={() => setIsModalOpen(false)} aria-label="Cerrar imagen">×</button>
        {images.length > 1 && <button className="lightbox-nav lightbox-previous" type="button" onClick={() => moveBy(-1)} aria-label="Ver imagen anterior">←</button>}
        <div className="lightbox-image-wrap" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={resumeAfterTouch}>
          <img src={activeImage.src} alt={activeImage.alt} />
        </div>
        {images.length > 1 && <button className="lightbox-nav lightbox-next" type="button" onClick={() => moveBy(1)} aria-label="Ver imagen siguiente">→</button>}
        <p className="lightbox-caption" aria-live="polite">{activeImage.label} · {activeIndex + 1} / {images.length}</p>
      </div>
    </div>}
  </>;
}
