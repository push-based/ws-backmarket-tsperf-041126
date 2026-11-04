/**
 * FIXED: Build the tuple from the digits of the length
 *
 * Produces the *exact same type* as the slow version - a tuple whose
 * `["length"]` is the requested number - but recurses once per decimal digit
 * instead of once per element. Each step multiplies the accumulator by ten
 * (ten spreads) and appends the digit's tuple, so `BuildTuple<900>` takes
 * 3 steps instead of 900 and creates ~N element slots in total instead of ~N²/2.
 *
 * Scales to 9,999 - the next wall is TypeScript's hard 10,000-element tuple
 * limit (TS2799), which no construction technique can pass.
 *
 * If the length doesn't actually need to live in the type, don't build a
 * tuple at all: a plain `T[]` has no recursion and no limit. That changes the
 * type, though, so it answers a different question than this file does.
 */

type DigitTuple = {
  "0": [];
  "1": [unknown];
  "2": [unknown, unknown];
  "3": [unknown, unknown, unknown];
  "4": [unknown, unknown, unknown, unknown];
  "5": [unknown, unknown, unknown, unknown, unknown];
  "6": [unknown, unknown, unknown, unknown, unknown, unknown];
  "7": [unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "8": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "9": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
};

type Times10<T extends unknown[]> = [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T];

type FromDigits<S extends string, Acc extends unknown[] = []> =
  S extends `${infer D extends keyof DigitTuple}${infer Rest}`
    ? FromDigits<Rest, [...Times10<Acc>, ...DigitTuple[D]]>
    : Acc;

type BuildTuple<Length extends number> = FromDigits<`${Length}`>;

// Same workload as the slow file - same resulting types, 3 recursion steps each:
type T500 = BuildTuple<500>;
type T900 = BuildTuple<900>;

// The length is still carried in the type, exactly as in the slow version.
// (Kept as a comment: reading `["length"]` off a 900-element tuple resolves
// all 900 members and adds ~900 instantiations, which would skew the
// comparison against the slow file, where no such read happens.)
// const len900: T900["length"] = 900;

// Lengths the linear version cannot reach (TS2589) resolve fine here:
// type T1200 = BuildTuple<1200>;
// type T9999 = BuildTuple<9999>;

export {};
