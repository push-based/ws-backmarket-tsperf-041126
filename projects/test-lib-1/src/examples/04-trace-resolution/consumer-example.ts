/**
 * Same import in both configs - only tsconfig.slow.json's "paths" override
 * decides whether this resolves to test-lib-2's .ts source or its built
 * .d.ts (see tsconfig.slow.json vs tsconfig.fixed.json).
 */

import { Calculator } from "test-lib-2";

const calculator = new Calculator();

export const sum = calculator.add(2, 3);
