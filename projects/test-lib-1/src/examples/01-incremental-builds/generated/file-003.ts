type Primitive3 = string | number | boolean | bigint | symbol | null | undefined;
type PreviousDepth3 = [never, 0, 1, 2, 3, 4, 5];
type DeepReadonly3<T, Depth extends number = 5> =
  Depth extends 0 ? T :
  T extends Primitive3 | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly3<Item, PreviousDepth3[Depth]>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly3<T[K], PreviousDepth3[Depth]> }
      : T;

interface Widget3 {
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
  next: Widget3Nested;
}
interface Widget3Nested { id: string; label: string; value: number; }

type Result3 = DeepReadonly3<Widget3>;
const w3: Widget3 = null as unknown as Widget3;
const r3: Result3 = w3;
export {};
