"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { Camera, CameraOff, ScanLine } from "lucide-react";

type Props = {
  onScan: (code: string) => void;
  /** מונע סריקות כפולות באותו קוד לזמן קצר */
  cooldownMs?: number;
  className?: string;
};

/**
 * סריקת ברקוד במצלמה — BarcodeDetector (Chrome/Android/Safari חדש).
 * בדפדפנים בלי תמיכה מוצגת הודעה + המשך עם שדה סריקה רגיל.
 */
export function CameraScanner({
  onScan,
  cooldownMs = 1800,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      !!navigator.mediaDevices?.getUserMedia;
    setSupported(ok);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("לא ניתן לפתוח מצלמה — בדקו הרשאות בדפדפן");
      stop();
    }
  }

  useEffect(() => {
    if (!active || !supported) return;
    let cancelled = false;
    type Detector = {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
    };
    const BD = (
      window as unknown as {
        BarcodeDetector: new (opts: { formats: string[] }) => Detector;
      }
    ).BarcodeDetector;
    const detector = new BD({
      formats: [
        "ean_13",
        "ean_8",
        "code_128",
        "code_39",
        "qr_code",
        "upc_a",
        "upc_e",
      ],
    });

    async function tick() {
      if (cancelled || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes?.length) {
          const raw = String(codes[0].rawValue || "").trim();
          if (raw) {
            const now = Date.now();
            if (
              raw !== lastRef.current.code ||
              now - lastRef.current.at > cooldownMs
            ) {
              lastRef.current = { code: raw, at: now };
              onScan(raw);
            }
          }
        }
      } catch {
        /* frame skip */
      }
      if (!cancelled) {
        window.setTimeout(tick, 350);
      }
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [active, supported, onScan, cooldownMs]);

  if (supported === false) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
        המצלמה לא נתמכת בדפדפן זה — השתמשו בסורק חיצוני / שדה הסריקה למטה.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap gap-2">
        {!active ? (
          <Button type="button" size="sm" onClick={() => start()}>
            <Camera className="h-4 w-4" />
            סריקה במצלמה
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={stop}>
            <CameraOff className="h-4 w-4" />
            עצור מצלמה
          </Button>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-[var(--danger)]">{error}</p>}
      {active && (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            playsInline
            muted
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-24 w-[70%] items-center justify-center rounded-lg border-2 border-[var(--lime)]/80">
              <ScanLine className="h-6 w-6 text-[var(--lime)]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
