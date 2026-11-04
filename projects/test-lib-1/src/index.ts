export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export class Calculator {
  add(a: number, b: number): number {
    return add(a, b);
  }

  multiply(a: number, b: number): number {
    return multiply(a, b);
  }
}

// Test execution
if (require.main === module) {
  const calc = new Calculator();
  console.log('2 + 3 =', calc.add(2, 3));
  console.log('4 * 5 =', calc.multiply(4, 5));
}
