/** קריאת JSON מתשובת fetch בלי לקרוס על גוף ריק / HTML */

export async function readJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "השרת החזיר תשובה ריקה"
        : `שגיאת שרת (${res.status}) — תשובה ריקה`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "תשובת שרת לא תקינה"
        : `שגיאת שרת (${res.status})`
    );
  }
}
