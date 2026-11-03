'use client';

import { useEffect, useRef } from 'react';

/** How far a drag past the top edge actually moves the sheet: the further, the less. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * A modal sheet. On phones it rises from the bottom with a grabber and follows your finger
 * down to dismiss (a quick flick is enough); on wider screens it's a centered dialog.
 * Opening and closing animate in CSS (globals.css, .sheet) and leave the way they came.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  label,
  className = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ id: number; startY: number; startT: number; lastY: number; lastT: number; prevY: number; prevT: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.style.transform = '';
      dialog.style.transition = '';
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const dialog = ref.current;
    if (!dialog || drag.current || e.button !== 0) return;
    if (!window.matchMedia('(max-width: 639.98px)').matches) return;
    const target = e.target as HTMLElement;
    if (!target.closest('[data-sheet-handle]') || target.closest('button, a, input, select, textarea, label')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    drag.current = { id: e.pointerId, startY: e.clientY, startT: now, lastY: e.clientY, lastT: now, prevY: e.clientY, prevT: now };
    dialog.style.transition = 'none';
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const dialog = ref.current;
    if (!d || !dialog || e.pointerId !== d.id) return;
    const dy = e.clientY - d.startY;
    // Glued to the finger going down; resisting more and more going up.
    const y = dy >= 0 ? dy : -rubberband(-dy, dialog.offsetHeight);
    dialog.style.transform = `translateY(${y}px)`;
    d.prevY = d.lastY;
    d.prevT = d.lastT;
    d.lastY = e.clientY;
    d.lastT = performance.now();
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const dialog = ref.current;
    if (!d || !dialog || e.pointerId !== d.id) return;
    drag.current = null;
    const dy = d.lastY - d.startY;
    const elapsed = Math.max(1, d.lastT - d.startT);
    const movingDown = d.lastY - d.prevY >= 0;
    const flick = dy / elapsed > 0.11;
    // Hand the sheet back to CSS: it animates from wherever the finger left it, either back
    // up or down and out. Closing here (not after a re-render) keeps it from twitching back.
    dialog.style.transition = '';
    dialog.style.transform = '';
    if (dy > 0 && movingDown && (flick || dy > dialog.offsetHeight * 0.3)) dialog.close();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={labelledBy}
      aria-label={label}
      className={`sheet ${className}`}
    >
      <div
        className="sheet-body"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div data-sheet-handle className="grabber sticky top-0 z-10 bg-[var(--sheet)] pb-1 pt-2" aria-hidden="true">
          <span className="mx-auto block h-[5px] w-9 rounded-full bg-line-strong" />
        </div>
        {children}
      </div>
    </dialog>
  );
}
