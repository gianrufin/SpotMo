interface RippleDot {
  id: number;
  x: number;
  y: number;
  size: number;
}

/** Renders the expanding dots produced by useRipple() — pair with the
 * `.ripple-host` class on the containing element. */
export function RippleLayer({ ripples }: { ripples: RippleDot[] }) {
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple-dot animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </>
  );
}
