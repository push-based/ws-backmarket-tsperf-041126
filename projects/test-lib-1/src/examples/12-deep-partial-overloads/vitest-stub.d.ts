// Just enough of Vitest's `vi.fn` typing for the specs in this example.
// tsconfig `paths` maps `vitest` to this file.
type Procedure = (...args: any[]) => any

export interface Mock<T extends Procedure = Procedure> {
  (...args: Parameters<T>): ReturnType<T>
  mockReturnValue(value: ReturnType<T>): this
}

export declare const vi: {
  fn<T extends Procedure = Procedure>(implementation?: T): Mock<T>
}
