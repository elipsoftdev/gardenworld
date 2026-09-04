'use client';

import { useState } from 'react';

export function reorderArray<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function OrderList<T>({
  items,
  itemKey,
  label,
  render,
  onReorder,
  disabled = false,
}: {
  items: T[];
  itemKey: (item: T) => string | number;
  label: string;
  render: (item: T, index: number) => React.ReactNode;
  onReorder: (items: T[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (disabled || from === to || to < 0 || to >= items.length) return;
    void onReorder(reorderArray(items, from, to));
  }

  return <div className="admin-sort-list" aria-label={label}>
    {items.map((item, index) => <div
      className={`admin-sort-item ${dragging === index ? 'is-dragging' : ''}`}
      key={itemKey(item)}
      draggable={!disabled}
      onDragStart={() => setDragging(index)}
      onDragEnd={() => setDragging(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => { if (dragging !== null) move(dragging, index); setDragging(null); }}
    >
      <span className="admin-sort-handle" aria-hidden="true">⠿</span>
      <div className="admin-sort-copy">{render(item, index)}</div>
      <div className="admin-sort-actions">
        <button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label={`Subir ${index + 1}`} disabled={disabled || index === 0} onClick={() => move(index, index - 1)}>↑</button>
        <button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label={`Bajar ${index + 1}`} disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1)}>↓</button>
      </div>
    </div>)}
  </div>;
}
