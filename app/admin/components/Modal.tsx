'use client';

import { useEffect, useRef } from 'react';

export function Modal({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  destructive = false,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  children?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key === 'Tab' && dialog.current) {
        const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')].filter((node) => !node.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose, open]);

  if (!open) return null;
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <div ref={dialog} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" aria-describedby={description ? 'admin-modal-description' : undefined}>
      <div className="admin-modal__head"><p className="admin-kicker">Confirmación</p><h2 id="admin-modal-title">{title}</h2>{description ? <p id="admin-modal-description">{description}</p> : null}</div>
      {children}
      {onConfirm ? <div className="admin-modal__actions">
        <button ref={cancel} type="button" className="admin-button admin-button--quiet" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className={`admin-button ${destructive ? 'admin-button--danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? 'Procesando…' : confirmLabel ?? 'Confirmar'}</button>
      </div> : null}
    </div>
  </div>;
}
