"use client";

import { RefObject, useEffect, useRef } from "react";

type ProductDescriptionModalProps = {
  isOpen: boolean;
  productName: string;
  description: string;
  openerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export default function ProductDescriptionModal({ isOpen, productName, description, openerRef, onClose }: ProductDescriptionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
      openerRef.current?.focus();
    };
  }, [isOpen, onClose, openerRef]);

  if (!isOpen) return null;

  return <div className="product-description-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="product-description-dialog" role="dialog" aria-modal="true" aria-labelledby="product-description-title">
      <button ref={closeButtonRef} className="product-description-close" type="button" onClick={onClose} aria-label="Cerrar descripción">×</button>
      <p className="eyebrow">Detalles del producto</p>
      <h2 id="product-description-title">{productName}</h2>
      <p>{description}</p>
    </div>
  </div>;
}
