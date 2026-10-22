import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function attributesLabel(attributes: unknown): string {
  let obj: Record<string, string> = {};
  if (typeof attributes === "string") {
    try {
      obj = JSON.parse(attributes);
    } catch {
      return "";
    }
  } else if (attributes && typeof attributes === "object") {
    obj = attributes as Record<string, string>;
  }
  const entries = Object.entries(obj);
  if (entries.length === 0) return "ללא אפשרויות";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}
