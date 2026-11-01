import type { Action } from 'svelte/action';

export interface Point { x: number; y: number }

export interface DragState extends Point { el: HTMLElement }

export interface DraggableOptions {
  enabled?: boolean;
  handle?: HTMLElement;
  bounds?: 'parent' | HTMLElement | null;
  onStart?: (s: DragState) => void;
  onMove?: (s: DragState) => void;
  /** Return a Point to override the final position (e.g. snapping). */
  onEnd?: (s: DragState) => Point | void;
}

export const draggable: Action<HTMLElement, DraggableOptions | undefined> = (
  el,
  opts = {},
) => {
  // handle is fixed at mount: listeners are bound to it once
  const handle = opts.handle ?? el;
  let { bounds = null, onStart, onMove, onEnd, enabled = true } = opts;

  const CORNERS = ['top', 'bottom', 'left', 'right'] as const;
  const getContainer = () =>
    bounds === 'parent' ? (el.offsetParent as HTMLElement | null) : bounds;

  let id: number | null = null;
  let x = 0, y = 0, ox = 0, oy = 0;
  let minX = -Infinity, maxX = Infinity, minY = -Infinity, maxY = Infinity;
  let raf = 0;

  const applyEnabled = () => {
    handle.style.touchAction = enabled ? 'none' : '';
  };
  applyEnabled();

  const render = () => {
    raf = 0;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const down = (e: PointerEvent) => {
    if (!enabled || id !== null || !e.isPrimary || e.button !== 0) return;
    el.style.transition = 'none';
    id = e.pointerId;
    handle.setPointerCapture(id);

    ox = e.clientX - x;
    oy = e.clientY - y;

    const container = getContainer();
    if (container) {
      const b = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      minX = x + (b.left - r.left);
      maxX = x + (b.right - r.right);
      minY = y + (b.top - r.top);
      maxY = y + (b.bottom - r.bottom);
    } else {
      minX = minY = -Infinity;
      maxX = maxY = Infinity;
    }

    document.documentElement.style.userSelect = 'none';
    onStart?.({ x, y, el });
  };

  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    x = Math.min(maxX, Math.max(minX, e.clientX - ox));
    y = Math.min(maxY, Math.max(minY, e.clientY - oy));
    if (!raf) raf = requestAnimationFrame(render);
    onMove?.({ x, y, el });
  };

  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    cancelAnimationFrame(raf);
    raf = 0;
    render();
    document.documentElement.style.userSelect = '';
    if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);

    const snap = onEnd?.({ x, y, el });
    if (snap) { x = snap.x; y = snap.y; render(); }

    const c = getContainer()?.getBoundingClientRect()
      ?? new DOMRect(0, 0, innerWidth, innerHeight);
    const r = el.getBoundingClientRect(); // First

    const v = r.top + r.height / 2 < c.top + c.height / 2 ? 'top' : 'bottom';
    const h = r.left + r.width / 2 < c.left + c.width / 2 ? 'left' : 'right';
    el.classList.remove(...CORNERS);
    el.classList.add(v, h);

    el.style.transition = 'none';
    x = 0; y = 0; render();
    const n = el.getBoundingClientRect(); // Last

    x = r.left - n.left;
    y = r.top - n.top;
    render(); // Invert
    el.getBoundingClientRect(); // force reflow

    el.style.transition = 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    x = 0; y = 0; render(); // Play
  };

  handle.addEventListener('pointerdown', down);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('lostpointercapture', end);

  return {
    update(next = {}) {
      ({ bounds = null, onStart, onMove, onEnd, enabled = true } = next);
      applyEnabled();
      // Disabled mid-drag: releasing capture fires lostpointercapture -> end()
      if (!enabled && id !== null && handle.hasPointerCapture(id)) {
        handle.releasePointerCapture(id);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      document.documentElement.style.userSelect = '';
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      handle.removeEventListener('lostpointercapture', end);
    },
  };
};