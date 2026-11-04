type Primitive18 = string | number | boolean | bigint | symbol | null | undefined;
type PreviousDepth18 = [never, 0, 1, 2, 3, 4, 5];
type DeepReadonly18<T, Depth extends number = 5> =
  Depth extends 0 ? T :
  T extends Primitive18 | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly18<Item, PreviousDepth18[Depth]>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly18<T[K], PreviousDepth18[Depth]> }
      : T;

interface Widget18 {
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
  next: Widget18Nested;
}
interface Widget18Nested { id: string; label: string; value: number; }

type Result18 = DeepReadonly18<Widget18>;
const w18: Widget18 = null as unknown as Widget18;
const r18: Result18 = w18;
export {};
