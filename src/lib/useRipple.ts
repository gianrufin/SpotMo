import { useCallback, useState, type PointerEvent } from 'react';

interface RippleDot {
  id: number;
  x: number;
  y: number;
  size: number;
}

let nextId = 0;

/** Material ripple: spawns an expanding dot at the pointer position on press.
 * Pair with the `.ripple-host` class (position:relative + overflow:hidden)
 * on the element, and render `ripples` inside it. */
export function useRipple() {
  const [ripples, setRipples] = useState<RippleDot[]>([]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const id = ++nextId;
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size },
    ]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  }, []);

  return { ripples, onPointerDown };
}
