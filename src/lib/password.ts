export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "לפחות 8 תווים", test: (p) => p.length >= 8 },
  { id: "lower", label: "אות קטנה (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "אות גדולה (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "מספר (0-9)", test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "תו מיוחד (!@#$…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      return `הסיסמה חייבת לכלול: ${PASSWORD_RULES.map((r) => r.label).join(" · ")}`;
    }
  }
  return null;
}

export function passwordStrength(password: string) {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

/** Temporary password that always satisfies PASSWORD_RULES. */
export function generateTempPassword(length = 12): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = lower + upper + digits + special;

  const pick = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)]!;

  const required = [pick(lower), pick(upper), pick(digits), pick(special)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () =>
    pick(all)
  );
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
