"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { Printer } from "lucide-react";

export function DocumentPrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      הדפסה
    </Button>
  );
}
