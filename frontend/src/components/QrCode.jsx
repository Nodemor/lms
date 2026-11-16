import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders text as a QR code image. High error correction so it scans well from a projector or print. */
export default function QrCode({ value, size = 280, className, alt = '' }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } })
      .then((url) => { if (alive) setSrc(url); }).catch(() => setSrc(null));
    return () => { alive = false; };
  }, [value, size]);
  if (!src) return <div className={className} style={{ width: size, height: size }} />;
  return <img src={src} width={size} height={size} alt={alt} className={className} />;
}

export function qrDataUrl(value, width = 1024) {
  return QRCode.toDataURL(value, { width, margin: 2, errorCorrectionLevel: 'H' });
}
