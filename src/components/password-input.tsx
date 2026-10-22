"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { PASSWORD_RULES, passwordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  showStrength?: boolean;
  placeholder?: string;
};

export function PasswordInput({
  id = "password",
  label = "סיסמה",
  value,
  onChange,
  required,
  autoComplete = "new-password",
  className,
  inputClassName,
  showStrength = false,
  placeholder,
}: Props) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn("pe-10", inputClassName)}
          minLength={showStrength ? 8 : undefined}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "הסתר סיסמה" : "הצג סיסמה"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-1">
            {PASSWORD_RULES.map((rule, i) => (
              <span
                key={rule.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition",
                  i < strength ? "bg-[var(--lime)]" : "bg-[var(--border)]"
                )}
              />
            ))}
          </div>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(value);
              return (
                <li
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-1.5",
                    ok ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      ok ? "bg-emerald-500" : "bg-[var(--border)]"
                    )}
                  />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
