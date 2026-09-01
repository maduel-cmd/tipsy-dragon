import { useCallback, useEffect, useRef, useState } from "react";

export type ShelfDragPayload = { kind: "shelf"; productId: string; label: string };
export type TrayDragPayload = { kind: "tray"; index: number; productId: string; label: string };
export type DragPayload = ShelfDragPayload | TrayDragPayload;

export type DropZone = "tray" | "shelf";

export type ActiveDrag = DragPayload & {
  x: number;
  y: number;
  moved: boolean;
  over: DropZone | null;
};

const MOVE_THRESHOLD_PX = 10;

type Handlers = {
  onShelfToTray: (productId: string) => void;
  onTrayToShelf: (index: number) => void;
  disabled?: boolean;
};

function zoneAtPoint(x: number, y: number): DropZone | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (el.closest("[data-drop='tray']")) return "tray";
  if (el.closest("[data-drop='shelf']")) return "shelf";
  return null;
}

/**
 * גרירת pointer (עכבר + מגע) בין מדף↔מגש.
 * אמין יותר מ־HTML5 DnD במובייל / כפתורים.
 */
export function useTrayShelfPointerDrag({ onShelfToTray, onTrayToShelf, disabled }: Handlers) {
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const captureElRef = useRef<HTMLElement | null>(null);

  const clearDrag = useCallback(() => {
    captureElRef.current = null;
    dragRef.current = null;
    startRef.current = null;
    setDrag(null);
  }, []);

  const beginDrag = useCallback(
    (
      payload: DragPayload,
      clientX: number,
      clientY: number,
      pointerId?: number,
      target?: HTMLElement | null,
    ) => {
      if (disabled) return;
      const next: ActiveDrag = {
        ...payload,
        x: clientX,
        y: clientY,
        moved: false,
        over: null,
      };
      dragRef.current = next;
      startRef.current = { x: clientX, y: clientY };
      setDrag(next);
      suppressClickRef.current = false;
      if (target && pointerId != null) {
        try {
          target.setPointerCapture(pointerId);
          captureElRef.current = target;
        } catch {
          captureElRef.current = null;
        }
      }
    },
    [disabled],
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      const start = startRef.current;
      if (!cur || !start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const moved = cur.moved || Math.hypot(dx, dy) >= MOVE_THRESHOLD_PX;
      const over = moved ? zoneAtPoint(e.clientX, e.clientY) : null;
      const next: ActiveDrag = { ...cur, x: e.clientX, y: e.clientY, moved, over };
      dragRef.current = next;
      setDrag(next);
      if (moved) {
        suppressClickRef.current = true;
        e.preventDefault();
      }
    };

    const onUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      const cap = captureElRef.current;
      if (cap) {
        try {
          cap.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        captureElRef.current = null;
      }
      clearDrag();
      if (!cur?.moved) return;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);

      const zone = zoneAtPoint(e.clientX, e.clientY);
      if (cur.kind === "shelf" && zone === "tray") {
        onShelfToTray(cur.productId);
        return;
      }
      if (cur.kind === "tray" && zone === "shelf") {
        onTrayToShelf(cur.index);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", clearDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", clearDrag);
    };
  }, [drag, clearDrag, onShelfToTray, onTrayToShelf]);

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  return { drag, beginDrag, shouldSuppressClick, clearDrag };
}
