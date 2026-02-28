// Greatest Common Divisor using Euclidean algorithm
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

// Least Common Multiple
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round(a) * Math.round(b)) / gcd(a, b);
}

// GCD of multiple numbers
export function gcdMultiple(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((acc, n) => gcd(acc, n));
}

// LCM of multiple numbers
export function lcmMultiple(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((acc, n) => lcm(acc, n));
}

// Check if a number is effectively an integer (within tolerance)
export function isEffectivelyInteger(n: number, tolerance = 1e-9): boolean {
  return Math.abs(n - Math.round(n)) < tolerance;
}

// Check if a number is a power of 2
export function isPowerOf2(n: number): boolean {
  if (n <= 0 || !Number.isInteger(n)) return false;
  return (n & (n - 1)) === 0;
}

// Check if an array of integer ratio parts sums to a power of 2
// (meaning the ratio is achievable with binary splitters in-game)
export function isSplitterFriendlyRatio(parts: number[]): boolean {
  if (parts.length <= 1) return true;
  const sum = parts.reduce((a, b) => a + b, 0);
  return isPowerOf2(sum);
}

// Check if an array of integer ratio parts has a small enough sum
// to be achievable with practical in-game splitter arrangements.
// Default threshold: sum ≤ 6 covers ratios like 1:5 but excludes 1:6, 3:4, etc.
export function isSimpleSplitterRatio(parts: number[], maxSum: number = 6): boolean {
  if (parts.length <= 1) return true;
  const sum = parts.reduce((a, b) => a + b, 0);
  return sum <= maxSum;
}

// Get the nearest power of 2 (can be higher or lower)
export function nearestPowerOf2(n: number): number {
  if (n <= 0) return 1;
  const lower = Math.pow(2, Math.floor(Math.log2(n)));
  const upper = Math.pow(2, Math.ceil(Math.log2(n)));
  return (n - lower) < (upper - n) ? lower : upper;
}
