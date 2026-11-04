/**
 * `as const`: a plain object plus a derived union type
 *
 * Unlike `const enum`, this is a real runtime object - but an ordinary one:
 * a single `const` declaration with no IIFE and no reverse mapping, so
 * bundlers can tree-shake it. It is plain JavaScript with type annotations,
 * so it compiles the same under `isolatedModules`, esbuild/swc/Babel and
 * `erasableSyntaxOnly`.
 */

export const LogLevel = {
  Debug: 0,
  Info: 1,
  Warn: 2,
  Error: 3,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

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
