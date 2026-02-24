import { gcd } from './gcd';

/**
 * Rational number class for exact arithmetic.
 * Avoids floating-point precision issues when computing building counts.
 */
export class Rational {
  readonly numerator: number;
  readonly denominator: number;

  constructor(numerator: number, denominator: number = 1) {
    if (denominator === 0) {
      throw new Error('Denominator cannot be zero');
    }

    // Normalize sign
    if (denominator < 0) {
      numerator = -numerator;
      denominator = -denominator;
    }

    // Reduce to lowest terms
    const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
    this.numerator = numerator / divisor;
    this.denominator = denominator / divisor;
  }

  static fromNumber(n: number, precision = 1000000): Rational {
    // Convert decimal to rational with given precision
    const denominator = precision;
    const numerator = Math.round(n * denominator);
    return new Rational(numerator, denominator);
  }

  static zero(): Rational {
    return new Rational(0, 1);
  }

  static one(): Rational {
    return new Rational(1, 1);
  }

  add(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  subtract(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  multiply(other: Rational): Rational {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }

  divide(other: Rational): Rational {
    if (other.numerator === 0) {
      throw new Error('Division by zero');
    }
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
  }

  scale(n: number): Rational {
    return new Rational(this.numerator * n, this.denominator);
  }

  toNumber(): number {
    return this.numerator / this.denominator;
  }

  isInteger(): boolean {
    return this.denominator === 1;
  }

  isZero(): boolean {
    return this.numerator === 0;
  }

  toString(): string {
    if (this.denominator === 1) {
      return String(this.numerator);
    }
    return `${this.numerator}/${this.denominator}`;
  }

  toDecimalString(decimals = 2): string {
    return this.toNumber().toFixed(decimals);
  }

  equals(other: Rational): boolean {
    return this.numerator === other.numerator && this.denominator === other.denominator;
  }

  lessThan(other: Rational): boolean {
    return this.numerator * other.denominator < other.numerator * this.denominator;
  }

  greaterThan(other: Rational): boolean {
    return this.numerator * other.denominator > other.numerator * this.denominator;
  }

  ceil(): number {
    return Math.ceil(this.toNumber());
  }

  floor(): number {
    return Math.floor(this.toNumber());
  }

  round(): number {
    return Math.round(this.toNumber());
  }
}
