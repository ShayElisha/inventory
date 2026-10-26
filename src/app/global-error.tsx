"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: "system-ui", padding: 40, textAlign: "center" }}>
        <h2>אירעה שגיאה</h2>
        <p>השגיאה נרשמה. נסו לרענן.</p>
        <button type="button" onClick={() => reset()}>
          נסו שוב
        </button>
      </body>
    </html>
  );
}
