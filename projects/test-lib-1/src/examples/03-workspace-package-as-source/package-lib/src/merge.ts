export type DeepMerge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A
      ? A[K] extends object
        ? B[K] extends object
          ? DeepMerge<A[K], B[K]>
          : B[K]
        : B[K]
      : B[K]
    : K extends keyof A
    ? A[K]
    : never;
};

export function deepMerge<A extends object, B extends object>(
  a: A,
  b: B,
): DeepMerge<A, B> {
  const result: Record<string, unknown> = { ...(a as object) };
  for (const key of Object.keys(b)) {
    const bValue = (b as Record<string, unknown>)[key];
    const aValue = (a as Record<string, unknown>)[key];
    if (
      bValue &&
      typeof bValue === "object" &&
      aValue &&
      typeof aValue === "object"
    ) {
      result[key] = deepMerge(
        aValue as Record<string, unknown>,
        bValue as Record<string, unknown>,
      );
    } else if (bValue !== undefined) {
      result[key] = bValue;
    }
  }
  return result as DeepMerge<A, B>;
}
