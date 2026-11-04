/**
 * `enum`: a regular enum is a runtime value, not just a type
 *
 * `tsc` emits every regular enum as an IIFE that builds a two-way lookup
 * object (name -> value and value -> name), and every use site reads a
 * property off that object at runtime. None of it can be tree-shaken: the
 * IIFE mutates a variable, so bundlers have to assume it has side effects.
 */

export enum LogLevel {
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
