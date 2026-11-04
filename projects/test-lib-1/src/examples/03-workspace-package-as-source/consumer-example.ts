/**
 * Identical consumer code in both configs - only the "@workspace/config"
 * path-alias target differs (see tsconfig.slow.json vs tsconfig.fixed.json).
 * That alone decides whether tsc type-checks the library's .ts source or
 * just reads its .d.ts.
 */

import { normalizeConfig } from "@workspace/config";

const config = normalizeConfig({
  name: "checkout-service",
  plugins: [{ name: "analytics" }],
});

export { config };
