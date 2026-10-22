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
