"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="font-display text-2xl font-bold">אירעה שגיאה</h2>
      <p className="text-sm text-[var(--muted)]">
        לא הצלחנו לטעון את העמוד. נסו שוב בעוד רגע.
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--muted)]">קוד: {error.digest}</p>
      )}
      <Button type="button" onClick={() => reset()}>
        נסו שוב
      </Button>
    </div>
  );
}
