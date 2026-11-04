export type Env = "development" | "staging" | "production";

export interface EnvMatrix<T> {
  development: T;
  staging: T;
  production: T;
}

export function resolveForEnv<T>(matrix: EnvMatrix<T>, env: Env): T {
  return matrix[env];
}
