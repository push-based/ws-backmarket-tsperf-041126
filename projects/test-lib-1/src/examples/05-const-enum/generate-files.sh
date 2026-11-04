#!/bin/bash
# Generates a scaled-up copy of this example in ./generated: one enum with
# COUNT members, each used once, as a regular `enum` (enum.ts), as a
# `const enum` (const-enum.ts) and as a plain object `as const` (as-const.ts). The small repro is too small for the emit
# difference to show up in `--extendedDiagnostics`; at this size it does.
#
# ./generated is gitignored, so these files never leak into the
# whole-project test-lib-1 measurements unless you generate them locally.
#
# Usage: ./generate-files.sh [count]

set -euo pipefail
COUNT="${1:-2000}"
DIR="$(dirname "$0")/generated"

rm -rf "$DIR"
mkdir -p "$DIR"

for variant in enum const-enum; do
  if [ "$variant" = enum ]; then keyword="enum"; else keyword="const enum"; fi
  file="$DIR/$variant.ts"
  {
    echo "export $keyword Code {"
    for i in $(seq 0 $((COUNT - 1))); do
      echo "  C$i,"
    done
    echo "}"
    echo ""
    echo "export const allCodes: Code[] = ["
    for i in $(seq 0 $((COUNT - 1))); do
      echo "  Code.C$i,"
    done
    echo "];"
  } > "$file"
done

file="$DIR/as-const.ts"
{
  echo "export const Code = {"
  for i in $(seq 0 $((COUNT - 1))); do
    echo "  C$i: $i,"
  done
  echo "} as const;"
  echo ""
  echo "export type Code = (typeof Code)[keyof typeof Code];"
  echo ""
  echo "export const allCodes: Code[] = ["
  for i in $(seq 0 $((COUNT - 1))); do
    echo "  Code.C$i,"
  done
  echo "];"
} > "$file"

echo "Generated $COUNT-member enum, const enum and as-const variants in $DIR"
