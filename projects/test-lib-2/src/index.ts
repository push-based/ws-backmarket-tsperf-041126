export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export class Calculator {
  add(a: number, b: number): number {
    return add(a, b);
  }

  multiply(a: number, b: number): number {
    return multiply(a, b);
  }
}

// ---------------------------------------------------------------------------
// Everything below is internal plumbing (not part of the public API - see
// dist/index.d.ts, which only carries the two functions and the class
// above). It still has to be fully parsed, bound, and type-checked whenever
// this file is resolved as source instead of as a compiled declaration.
// ---------------------------------------------------------------------------

type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

type DeepMerge<A, B> = {
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

type Zip<A extends readonly unknown[], B extends readonly unknown[]> = A extends [infer AH, ...infer AT]
  ? B extends [infer BH, ...infer BT]
    ? [[AH, BH], ...Zip<AT, BT>]
    : []
  : [];

type Flatten<T> = T extends readonly [infer Head, ...infer Tail]
  ? Head extends readonly unknown[]
    ? [...Flatten<Head>, ...Flatten<Tail>]
    : [Head, ...Flatten<Tail>]
  : [];

interface StatisticsConfig {
  precision: number;
  rounding: "up" | "down" | "nearest";
  metadata: {
    source: string;
    tags: string[];
    nested: {
      createdBy: string;
      history: { at: string; note: string }[];
    };
  };
}

function mergeStatisticsConfig(
  base: StatisticsConfig,
  overrides: DeepPartial<StatisticsConfig>
): DeepMerge<StatisticsConfig, DeepPartial<StatisticsConfig>> {
  return { ...base, ...overrides } as DeepMerge<StatisticsConfig, DeepPartial<StatisticsConfig>>;
}

function freezeStatisticsConfig(config: StatisticsConfig): DeepReadonly<StatisticsConfig> {
  return config as DeepReadonly<StatisticsConfig>;
}

const sampleNumbers = [4, 8, 15, 16, 23, 42] as const;
const sampleLabels = ["a", "b", "c", "d", "e", "f"] as const;

function zipSample(): Zip<typeof sampleNumbers, typeof sampleLabels> {
  return sampleNumbers.map((n, i) => [n, sampleLabels[i]]) as unknown as Zip<typeof sampleNumbers, typeof sampleLabels>;
}

const nestedTuple = [[1, 2], [3, [4, 5]], 6] as const;

function flattenSample(): Flatten<typeof nestedTuple> {
  return (nestedTuple as unknown as unknown[]).flat(Infinity) as unknown as Flatten<typeof nestedTuple>;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]): number {
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

type Matrix = number[][];

function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
  const result: Matrix = [];
  for (let i = 0; i < a.length; i++) {
    result[i] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function transposeMatrix(matrix: Matrix): Matrix {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function identityMatrix(size: number): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
  );
}

type EventMap = Record<string, unknown[]>;

class TypedEventBus<T extends EventMap> {
  private listeners: { [K in keyof T]?: Array<(...args: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    const existing = this.listeners[event] ?? [];
    existing.push(listener);
    this.listeners[event] = existing;
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    (this.listeners[event] ?? []).forEach((listener) => listener(...args));
  }
}

interface CalculatorEvents extends EventMap {
  computed: [operation: "add" | "multiply", result: number];
  reset: [];
}

function createCalculatorBus(): TypedEventBus<CalculatorEvents> {
  const bus = new TypedEventBus<CalculatorEvents>();
  bus.on("computed", (operation, result) => {
    void operation;
    void result;
  });
  return bus;
}

export function describe(values: number[]): { mean: number; variance: number; stdDev: number } {
  return {
    mean: mean(values),
    variance: variance(values),
    stdDev: standardDeviation(values),
  };
}

// ---------------------------------------------------------------------------
// A permission matrix generated by distributing a template literal type over
// three unions. Each combination is a distinct string literal type, so the
// checker has to materialize Action x Resource x Scope types just to resolve
// the alias - a classic source of combinatorial (not just recursive) blowup.
// ---------------------------------------------------------------------------

type Action =
  | "create" | "read" | "update" | "delete" | "list"
  | "archive" | "restore" | "export" | "import" | "share"
  | "approve" | "reject" | "publish" | "unpublish" | "duplicate";

type Resource =
  | "user" | "team" | "project" | "invoice" | "report"
  | "document" | "comment" | "notification" | "webhook" | "apiKey"
  | "dashboard" | "workspace" | "role" | "auditLog" | "integration";

type Scope = "own" | "team" | "org" | "global" | "delegated";

type Permission = `${Action}:${Resource}:${Scope}`;

function hasPermission(grants: Permission[], required: Permission): boolean {
  return grants.includes(required);
}

// ---------------------------------------------------------------------------
// A recursive key-path type over a wide, multi-level config object. Every
// nested property adds another branch the checker must union together, so
// depth and width compound rather than add.
// ---------------------------------------------------------------------------

type Paths<T, Prefix extends string = ""> = T extends readonly unknown[]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: `${Prefix}${K}` | Paths<T[K], `${Prefix}${K}.`>;
      }[keyof T & string]
    : never;

interface AppConfig {
  auth: {
    session: { ttlSeconds: number; renewOnActivity: boolean; cookie: { name: string; secure: boolean } };
    oauth: { providers: { google: { clientId: string }; github: { clientId: string } } };
    mfa: { enabled: boolean; methods: { totp: { issuer: string }; sms: { region: string } } };
  };
  billing: {
    plans: { free: { seats: number }; pro: { seats: number }; enterprise: { seats: number } };
    invoicing: { dueDays: number; retry: { attempts: number; backoffSeconds: number } };
  };
  notifications: {
    email: { fromAddress: string; templates: { welcome: { subject: string }; invoice: { subject: string } } };
    push: { enabled: boolean; provider: { name: string; region: string } };
  };
  featureFlags: {
    experiments: { checkoutV2: boolean; darkMode: boolean };
    rollout: { percentage: number; allowList: { userIds: string[] } };
  };
}

function getConfigPath(path: Paths<AppConfig>): Paths<AppConfig> {
  return path;
}

// ---------------------------------------------------------------------------
// Fixed-capacity buffer arithmetic verified as a tuple length at the type
// level, not just declared as `number`. This is the kind of type-level
// arithmetic that shows up in schema/ORM/state-machine libraries, and it's
// dramatically more expensive to check than it looks from the call site:
// each distinct capacity pair forces the checker to build and compare a
// same-length tuple step by step rather than reuse a single instantiation.
// ---------------------------------------------------------------------------

type BuildTuple<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : BuildTuple<N, [...Acc, unknown]>;

type CombinedCapacity<A extends number, B extends number> = [...BuildTuple<A>, ...BuildTuple<B>]["length"];

function combinedBufferCapacity<A extends number, B extends number>(a: A, b: B): CombinedCapacity<A, B> {
  return (a + b) as CombinedCapacity<A, B>;
}

function mergeSampleBuffers() {
  const a = combinedBufferCapacity<300, 300>(300, 300);
  const b = combinedBufferCapacity<280, 310>(280, 310);
  const c = combinedBufferCapacity<250, 340>(250, 340);
  const d = combinedBufferCapacity<320, 270>(320, 270);
  const e = combinedBufferCapacity<260, 330>(260, 330);
  return [a, b, c, d, e];
}

// Test execution
if (require.main === module) {
  const calc = new Calculator();
  console.log('2 + 3 =', calc.add(2, 3));
  console.log('4 * 5 =', calc.multiply(4, 5));

  const config = freezeStatisticsConfig(
    mergeStatisticsConfig(
      {
        precision: 2,
        rounding: "nearest",
        metadata: { source: "seed", tags: [], nested: { createdBy: "seed", history: [] } },
      },
      { metadata: { tags: ["demo"] } }
    ) as StatisticsConfig
  );
  void config;
  void zipSample();
  void flattenSample();
  void multiplyMatrix(identityMatrix(2), transposeMatrix([[1, 2], [3, 4]]));
  void createCalculatorBus();
  void hasPermission(["read:user:own"], "delete:project:org");
  void getConfigPath("auth.session.cookie.name");
  void mergeSampleBuffers();
}
