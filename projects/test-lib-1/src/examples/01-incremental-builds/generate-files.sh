#!/bin/bash
# Regenerates the synthetic files in ./generated used to demonstrate the
# check-time impact of `incremental`. Each file is independent (no shared
# imports) and does a modest amount of real type-checking work, so the
# total across all of them is large enough to see, while touching any one
# file only affects that file's own signature.
#
# Usage: ./generate-files.sh [count]

set -euo pipefail
COUNT="${1:-80}"
DIR="$(dirname "$0")/generated"

rm -rf "$DIR"
mkdir -p "$DIR"

for i in $(seq 1 "$COUNT"); do
  n=$(printf '%03d' "$i")
  file="$DIR/file-$n.ts"
  {
    echo "type Primitive$i = string | number | boolean | bigint | symbol | null | undefined;"
    echo "type PreviousDepth$i = [never, 0, 1, 2, 3, 4, 5];"
    echo "type DeepReadonly$i<T, Depth extends number = 5> ="
    echo "  Depth extends 0 ? T :"
    echo "  T extends Primitive$i | Date | RegExp ? T :"
    echo "  T extends readonly (infer Item)[]"
    echo "    ? ReadonlyArray<DeepReadonly$i<Item, PreviousDepth$i[Depth]>>"
    echo "    : T extends object"
    echo "      ? { readonly [K in keyof T]: DeepReadonly$i<T[K], PreviousDepth$i[Depth]> }"
    echo "      : T;"
    echo ""
    echo "interface Widget$i {"
    for p in $(seq 1 20); do
      echo "  field$p: { id: string; count: number; tags: string[]; meta: { a: number; b: string } };"
    done
    echo "  next: Widget${i}Nested;"
    echo "}"
    echo "interface Widget${i}Nested { id: string; label: string; value: number; }"
    echo ""
    echo "type Result$i = DeepReadonly$i<Widget$i>;"
    echo "const w$i: Widget$i = null as unknown as Widget$i;"
    echo "const r$i: Result$i = w$i;"
    echo "export {};"
  } > "$file"
done

echo "Generated $COUNT files in $DIR"
