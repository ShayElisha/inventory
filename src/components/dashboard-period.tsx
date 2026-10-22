"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

export function DashboardPeriod() {
  const router = useRouter();
  const params = useSearchParams();
  const period = params.get("period") || "today";

  return (
    <Select
      className="w-40"
      value={period}
      onChange={(e) => router.push(`/dashboard?period=${e.target.value}`)}
    >
      <option value="today">היום</option>
      <option value="week">שבוע</option>
      <option value="month">חודש</option>
    </Select>
  );
}
