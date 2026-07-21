import { useEffect, useRef, useState } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

// Canonical poster ratio every uploaded image gets normalized to — every
// other place in the app (map pins, cards, hero) renders posterUrl with
// object-fit: cover, so baking a consistent, user-chosen crop in here (rather
// than leaving it to each container's own blind center-crop) keeps framing
// intentional everywhere the poster shows up.
const OUTPUT_W = 900;
const OUTPUT_H = 1200; // 3:4 portrait
const MAX_ZOOM = 3;

interface PosterCropperProps {
  /** A data: URL of a freshly-selected local file — never a remote URL,
   * so canvas export never risks a cross-origin "tainted canvas" error. */
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export function PosterCropper({ src, onConfirm, onCancel }: PosterCropperProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const [containerSize, setContainerSize] = useState({ w: 300, h: 400 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // on-screen px, {0,0} = centered

  useEffect(() => {
    function measure() {
      if (frameRef.current) {
        const r = frameRef.current.getBoundingClientRect();
        setContainerSize({ w: r.width, h: r.height });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // "Cover" baseline (like object-fit: cover) at zoom 1 — the smaller
  // dimension exactly fills the frame, the larger one overflows/gets clipped.
  const baseScale = natural
    ? Math.max(containerSize.w / natural.w, containerSize.h / natural.h)
    : 1;
  const renderedW = natural ? natural.w * baseScale * zoom : containerSize.w;
  const renderedH = natural ? natural.h * baseScale * zoom : containerSize.h;
  const maxPanX = Math.max(0, (renderedW - containerSize.w) / 2);
  const maxPanY = Math.max(0, (renderedH - containerSize.h) / 2);

  function clamp(px: number, py: number) {
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    };
  }

  // Re-clamp whenever zoom (or a resize) changes — zooming out can leave a
  // previously-valid pan pointing past the now-smaller allowed range.
  useEffect(() => {
    setPan((p) => clamp(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, containerSize.w, containerSize.h, natural?.w, natural?.h]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan(clamp(dragState.current.panX + dx, dragState.current.panY + dy));
  }
  function onPointerUp() {
    dragState.current = null;
  }

  function handleConfirm() {
    if (!natural || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const exportScale = OUTPUT_W / containerSize.w;
    const outBaseScale = Math.max(OUTPUT_W / natural.w, OUTPUT_H / natural.h);
    const outW = natural.w * outBaseScale * zoom;
    const outH = natural.h * outBaseScale * zoom;
    const dx = (OUTPUT_W - outW) / 2 + pan.x * exportScale;
    const dy = (OUTPUT_H - outH) / 2 + pan.y * exportScale;
    ctx.drawImage(imgRef.current, dx, dy, outW, outH);
    // 0.72 rather than the ~0.9 default: visually near-identical for a
    // photographic poster but meaningfully smaller, since every uploaded
    // poster is stored inline as a data: URL (no object storage yet) and gets
    // fetched by every visitor's map load and every admin queue page.
    onConfirm(canvas.toDataURL('image/jpeg', 0.72));
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Cancel"
        >
          <X size={18} strokeWidth={2} />
        </button>
        <p className="text-[14px] font-medium text-white">Adjust poster</p>
        <button
          onClick={handleConfirm}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white"
          aria-label="Use this photo"
        >
          <Check size={18} strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <div
          ref={frameRef}
          className="relative aspect-[3/4] w-full max-w-xs touch-none select-none overflow-hidden rounded-2xl bg-surface"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
            }
            className="absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: renderedW,
              height: renderedH,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 pb-8 pt-2">
        <ZoomOut size={17} strokeWidth={1.9} className="shrink-0 text-white/60" />
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full flex-1 accent-brand"
        />
        <ZoomIn size={17} strokeWidth={1.9} className="shrink-0 text-white/60" />
      </div>
      <p className="pb-6 text-center text-[12px] text-white/50">Drag to reposition · slide to zoom</p>
    </div>
  );
}
