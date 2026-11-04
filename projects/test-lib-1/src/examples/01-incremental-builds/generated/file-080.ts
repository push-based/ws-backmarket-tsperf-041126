type Primitive80 = string | number | boolean | bigint | symbol | null | undefined;
type PreviousDepth80 = [never, 0, 1, 2, 3, 4, 5];
type DeepReadonly80<T, Depth extends number = 5> =
  Depth extends 0 ? T :
  T extends Primitive80 | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly80<Item, PreviousDepth80[Depth]>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly80<T[K], PreviousDepth80[Depth]> }
      : T;

interface Widget80 {
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
  next: Widget80Nested;
}
interface Widget80Nested { id: string; label: string; value: number; }

type Result80 = DeepReadonly80<Widget80>;
const w80: Widget80 = null as unknown as Widget80;
const r80: Result80 = w80;
export {};
