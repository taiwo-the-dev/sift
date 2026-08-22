type LogLevel = "error" | "info" | "warn";

export type LogValue =
  | boolean
  | null
  | number
  | string
  | readonly LogValue[]
  | { readonly [key: string]: LogValue };

export type LogContext = Readonly<Record<string, LogValue>>;
export type LogSink = (line: string) => void;

const secretPatterns = [
  /([?&](?:api[_-]?key|key|token|secret)=)[^&\s]+/gi,
  /(bearer\s+)[a-z0-9._~+/=-]+/gi,
  /(sb_secret_)[a-z0-9._-]+/gi,
] as const;

export function sanitizeLogText(value: string): string {
  let sanitized = value.slice(0, 500);

  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, "$1[redacted]");
  }

  return sanitized.replace(
    /(https?:\/\/[^\s?#]+)\?[^\s#]*/gi,
    "$1?[redacted]",
  );
}

export function sanitizeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: sanitizeLogText(error.message),
    };
  }

  return { errorMessage: sanitizeLogText(String(error)) };
}

export type Logger = Readonly<{
  error(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
}>;

export function createLogger(
  sink: LogSink = (line) => process.stdout.write(`${line}\n`),
  now: () => Date = () => new Date(),
): Logger {
  function write(
    level: LogLevel,
    event: string,
    context: LogContext = {},
  ): void {
    sink(
      JSON.stringify({
        timestamp: now().toISOString(),
        level,
        event,
        ...context,
      }),
    );
  }

  return {
    error: (event, context) => write("error", event, context),
    info: (event, context) => write("info", event, context),
    warn: (event, context) => write("warn", event, context),
  };
}
