"use client";

import { PointerEvent as ReactPointerEvent, TouchEvent, WheelEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

type Point = { x: number; y: number };

const AUTOPLAY_DELAY = 3000;
const MAX_ZOOM = 3;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.5;
const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const distanceBetween = (first: Point, second: Point) => Math.hypot(second.x - first.x, second.y - first.y);

export default function ProductGallery({ productName, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoplayCycle, setAutoplayCycle] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);
  const zoomRef = useRef(MIN_ZOOM);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, Point>());
  const dragStartRef = useRef<{ point: Point; pan: Point } | null>(null);
  const swipeStartRef = useRef<Point | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const resetView = useCallback(() => {
    zoomRef.current = MIN_ZOOM;
    panRef.current = { x: 0, y: 0 };
    setIsDragging(false);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  const getPanBounds = useCallback((forZoom = zoomRef.current) => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image) return { x: 0, y: 0 };

    return {
      x: Math.max(0, (image.offsetWidth * forZoom - viewport.clientWidth) / 2),
      y: Math.max(0, (image.offsetHeight * forZoom - viewport.clientHeight) / 2),
    };
  }, []);

  const clampPan = useCallback((point: Point, forZoom = zoomRef.current) => {
    const bounds = getPanBounds(forZoom);
    return {
      x: Math.min(bounds.x, Math.max(-bounds.x, point.x)),
      y: Math.min(bounds.y, Math.max(-bounds.y, point.y)),
    };
  }, [getPanBounds]);

  const updatePan = useCallback((next: Point | ((current: Point) => Point)) => {
    setPan((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      const bounded = clampPan(resolved);
      panRef.current = bounded;
      return bounded;
    });
  }, [clampPan]);

  const applyZoom = useCallback((requestedZoom: number, focalPoint?: Point) => {
    const currentZoom = zoomRef.current;
    const nextZoom = clampZoom(requestedZoom);
    if (nextZoom === currentZoom) return;

    if (nextZoom === MIN_ZOOM) {
      resetView();
      return;
    }

    zoomRef.current = nextZoom;
    setZoom(nextZoom);

    if (focalPoint && viewportRef.current) {
      const bounds = viewportRef.current.getBoundingClientRect();
      const scaleRatio = nextZoom / currentZoom;
      const offsetX = focalPoint.x - (bounds.left + bounds.width / 2);
      const offsetY = focalPoint.y - (bounds.top + bounds.height / 2);
      updatePan((current) => ({
        x: current.x - offsetX * (scaleRatio - 1),
        y: current.y - offsetY * (scaleRatio - 1),
      }));
    } else {
      updatePan((current) => current);
    }
  }, [resetView, updatePan]);

  const changeImage = useCallback((nextIndex: number | ((currentIndex: number) => number)) => {
    resetView();
    setActiveIndex((currentIndex) => {
      const requestedIndex = typeof nextIndex === "function" ? nextIndex(currentIndex) : nextIndex;
      return (requestedIndex + images.length) % images.length;
    });
  }, [images.length, resetView]);

  const moveBy = useCallback((step: number) => {
    changeImage((currentIndex) => currentIndex + step);
  }, [changeImage]);

  const selectImage = (index: number) => {
    changeImage(index);
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

  const openModal = () => {
    resetView();
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    resetView();
    setIsModalOpen(false);
  }, [resetView]);

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
    const keepPanInBounds = () => {
      if (zoomRef.current === MIN_ZOOM) {
        resetView();
        return;
      }
      updatePan((current) => current);
    };
    window.addEventListener("resize", keepPanInBounds);
    return () => window.removeEventListener("resize", keepPanInBounds);
  }, [isModalOpen, resetView, updatePan]);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousFocusedElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const previousScrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
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
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        applyZoom(zoomRef.current + ZOOM_STEP);
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        applyZoom(zoomRef.current - ZOOM_STEP);
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
      document.body.style.paddingRight = previousPaddingRight;
      window.scrollTo({ top: previousScrollY });
      previousFocusedElement?.focus();
    };
  }, [applyZoom, closeModal, isModalOpen, moveBy]);

  const handleGalleryTouchStart = (event: TouchEvent<HTMLElement>) => {
    pauseForTouch();
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchStartX.current !== null && endX !== undefined) {
      const distance = endX - touchStartX.current;
      if (Math.abs(distance) > 45) moveBy(distance > 0 ? -1 : 1);
    }
    touchStartX.current = null;
    resumeAfterTouch();
  };

  const handleLightboxPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: distanceBetween(first, second), zoom: zoomRef.current };
      dragStartRef.current = null;
      swipeStartRef.current = null;
      setIsDragging(false);
      return;
    }

    if (zoomRef.current > MIN_ZOOM) {
      dragStartRef.current = { point, pan: panRef.current };
      setIsDragging(true);
    } else if (event.pointerType === "touch") {
      swipeStartRef.current = point;
    }
  };

  const handleLightboxPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2) {
      const pinch = pinchRef.current;
      if (!pinch) return;
      const nextZoom = clampZoom(pinch.zoom * (distanceBetween(points[0], points[1]) / pinch.distance));
      applyZoom(nextZoom);
      return;
    }

    const dragStart = dragStartRef.current;
    if (dragStart && zoomRef.current > MIN_ZOOM) {
      updatePan({
        x: dragStart.pan.x + point.x - dragStart.point.x,
        y: dragStart.pan.y + point.y - dragStart.point.y,
      });
    }
  };

  const handleLightboxPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    const swipeStart = swipeStartRef.current;
    const wasZoomed = zoomRef.current > MIN_ZOOM;
    pointersRef.current.delete(event.pointerId);

    if (swipeStart && !wasZoomed && event.pointerType === "touch") {
      const horizontalDistance = point.x - swipeStart.x;
      const verticalDistance = point.y - swipeStart.y;
      if (Math.abs(horizontalDistance) > 55 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
        moveBy(horizontalDistance > 0 ? -1 : 1);
      }
    }

    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragStartRef.current = null;
    swipeStartRef.current = null;
    setIsDragging(false);
  };

  const handleLightboxWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    applyZoom(zoomRef.current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), { x: event.clientX, y: event.clientY });
  };

  const handleLightboxDoubleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    applyZoom(zoomRef.current > MIN_ZOOM ? MIN_ZOOM : 2, { x: event.clientX, y: event.clientY });
  };

  const activeImage = images[activeIndex] ?? images[0];
  if (!activeImage) return null;

  const lightbox = isModalOpen && typeof document !== "undefined" ? createPortal(
    <div className="product-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div ref={dialogRef} className="product-lightbox-dialog" role="dialog" aria-modal="true" aria-label={`Vista ampliada de ${productName}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <button ref={closeButtonRef} className="lightbox-close" type="button" onClick={closeModal} aria-label="Cerrar imagen">×</button>
        {images.length > 1 && <button className="lightbox-nav lightbox-previous" type="button" onClick={() => moveBy(-1)} aria-label="Ver imagen anterior">←</button>}
        <div
          ref={viewportRef}
          className={`lightbox-viewport${zoom > MIN_ZOOM ? " is-zoomed" : ""}${isDragging ? " is-dragging" : ""}`}
          onPointerDown={handleLightboxPointerDown}
          onPointerMove={handleLightboxPointerMove}
          onPointerUp={handleLightboxPointerEnd}
          onPointerCancel={handleLightboxPointerEnd}
          onWheel={handleLightboxWheel}
          onDoubleClick={handleLightboxDoubleClick}
          onClick={(event) => { if (event.target === event.currentTarget && zoomRef.current === MIN_ZOOM) closeModal(); }}
        >
          <img ref={imageRef} src={activeImage.src} alt={activeImage.alt} style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) translate(-50%, -50%) scale(${zoom})` }} onLoad={() => updatePan((current) => current)} draggable={false} />
        </div>
        {images.length > 1 && <button className="lightbox-nav lightbox-next" type="button" onClick={() => moveBy(1)} aria-label="Ver imagen siguiente">→</button>}
        <div className="lightbox-tools" aria-label="Controles de zoom">
          <button type="button" onClick={() => applyZoom(zoom - ZOOM_STEP)} aria-label="Alejar imagen">−</button>
          <button type="button" onClick={resetView} aria-label="Restablecer zoom y posición">Restablecer</button>
          <button type="button" onClick={() => applyZoom(zoom + ZOOM_STEP)} aria-label="Acercar imagen">+</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return <>
    <div
      className="product-media"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleGalleryTouchStart}
      onTouchEnd={handleGalleryTouchEnd}
      onTouchCancel={resumeAfterTouch}
    >
      <div className="finish-image">
        <button className="product-main-image-button" type="button" onClick={openModal} aria-label={`Ampliar ${activeImage.label} de ${productName}`}>
          <img key={activeImage.src} src={activeImage.src} alt={activeImage.alt} className={`is-active product-main-image product-main-image-${activeImage.fit}`} decoding="async" />
          <span className="product-zoom-indicator" aria-hidden="true">⌕</span>
        </button>
        <span className="finish-counter" aria-live="polite">{activeImage.label}</span>
      </div>
      <div className="product-gallery" aria-label={`Galería de ${productName}`}>
        {images.map((image, index) => <button type="button" key={image.src} className={index === activeIndex ? "is-active" : ""} aria-label={`Ver ${image.label} de ${productName}`} aria-pressed={index === activeIndex} onClick={() => selectImage(index)}><img src={image.src} alt="" loading="lazy" decoding="async" /></button>)}
      </div>
    </div>
    {lightbox}
  </>;
}
