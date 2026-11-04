type Primitive32 = string | number | boolean | bigint | symbol | null | undefined;
type PreviousDepth32 = [never, 0, 1, 2, 3, 4, 5];
type DeepReadonly32<T, Depth extends number = 5> =
  Depth extends 0 ? T :
  T extends Primitive32 | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly32<Item, PreviousDepth32[Depth]>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly32<T[K], PreviousDepth32[Depth]> }
      : T;

interface Widget32 {
  field1: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field2: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field3: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field4: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field5: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field6: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field7: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field8: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field9: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field10: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field11: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field12: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field13: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field14: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field15: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field16: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field17: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field18: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field19: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  field20: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };
  next: Widget32Nested;
}
interface Widget32Nested { id: string; label: string; value: number; }

type Result32 = DeepReadonly32<Widget32>;
const w32: Widget32 = null as unknown as Widget32;
const r32: Result32 = w32;
export {};
