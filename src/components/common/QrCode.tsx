import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Renders a QR code entirely client-side — no external API, no network call. */
export function QrCode({ value, size = 200, className = '' }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#141B18', light: '#FBFAF7' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-surface ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-[12px] text-muted">Generating…</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR code linking to this event"
      width={size}
      height={size}
      className={className}
    />
  );
}
