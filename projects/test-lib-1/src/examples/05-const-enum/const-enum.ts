/**
 * `const enum`: compiled away
 *
 * Same source with one keyword added. `tsc` emits no enum object at all:
 * every `LogLevel.X` is replaced by its literal value (`LogLevel.Debug` -> `0`),
 * so the enum costs nothing at runtime. This only holds when `tsc` itself
 * emits with `isolatedModules` off - see the README's pitfalls.
 */

export const enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

export function shouldLog(level: LogLevel, min: LogLevel): boolean {
  return level >= min;
}

export function label(level: LogLevel): string {
  switch (level) {
    case LogLevel.Debug:
      return "debug";
    case LogLevel.Info:
      return "info";
    case LogLevel.Warn:
      return "warn";
    case LogLevel.Error:
      return "error";
  }
}

export const isNoisy = shouldLog(LogLevel.Debug, LogLevel.Warn);
