type LogFields = Record<string, unknown>;

function base(level: string, message: string, fields?: LogFields) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  if (level === "error" && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/nextjs") as {
        captureException?: (e: unknown) => void;
        captureMessage?: (m: string) => void;
      };
      if (fields?.err) Sentry.captureException?.(fields.err);
      else Sentry.captureMessage?.(message);
    } catch {
      // ignore
    }
  }
}

export const logger = {
  info(message: string, fields?: LogFields) {
    base("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    base("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    base("error", message, fields);
  },
};
