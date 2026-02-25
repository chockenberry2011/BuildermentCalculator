import { describe, it, expect } from 'vitest';
import { Rational } from '../rational';

describe('Rational', () => {
  describe('construction', () => {
    it('reduces to lowest terms', () => {
      const r = new Rational(4, 6);
      expect(r.numerator).toBe(2);
      expect(r.denominator).toBe(3);
    });

    it('normalizes negative denominator', () => {
      const r = new Rational(3, -4);
      expect(r.numerator).toBe(-3);
      expect(r.denominator).toBe(4);
    });

    it('throws on zero denominator', () => {
      expect(() => new Rational(1, 0)).toThrow('Denominator cannot be zero');
    });

    it('handles zero numerator', () => {
      const r = new Rational(0, 5);
      expect(r.numerator).toBe(0);
      expect(r.denominator).toBe(1);
    });
  });

  describe('fromNumber', () => {
    it('converts integer', () => {
      const r = Rational.fromNumber(5);
      expect(r.toNumber()).toBe(5);
      expect(r.isInteger()).toBe(true);
    });

    it('converts decimal', () => {
      const r = Rational.fromNumber(0.5);
      expect(r.toNumber()).toBe(0.5);
    });

    it('converts small fraction', () => {
      const r = Rational.fromNumber(1 / 3);
      expect(Math.abs(r.toNumber() - 1 / 3)).toBeLessThan(0.000001);
    });
  });

  describe('arithmetic', () => {
    it('adds fractions', () => {
      const a = new Rational(1, 3);
      const b = new Rational(1, 6);
      const result = a.add(b);
      expect(result.numerator).toBe(1);
      expect(result.denominator).toBe(2);
    });

    it('subtracts fractions', () => {
      const a = new Rational(3, 4);
      const b = new Rational(1, 4);
      const result = a.subtract(b);
      expect(result.numerator).toBe(1);
      expect(result.denominator).toBe(2);
    });

    it('multiplies fractions', () => {
      const a = new Rational(2, 3);
      const b = new Rational(3, 4);
      const result = a.multiply(b);
      expect(result.numerator).toBe(1);
      expect(result.denominator).toBe(2);
    });

    it('divides fractions', () => {
      const a = new Rational(1, 2);
      const b = new Rational(3, 4);
      const result = a.divide(b);
      expect(result.numerator).toBe(2);
      expect(result.denominator).toBe(3);
    });

    it('throws on division by zero', () => {
      const a = new Rational(1, 2);
      const b = Rational.zero();
      expect(() => a.divide(b)).toThrow('Division by zero');
    });

    it('scales by integer', () => {
      const r = new Rational(1, 3);
      const scaled = r.scale(6);
      expect(scaled.toNumber()).toBe(2);
    });
  });

  describe('comparisons', () => {
    it('equals with same value', () => {
      expect(new Rational(1, 2).equals(new Rational(2, 4))).toBe(true);
    });

    it('lessThan works', () => {
      expect(new Rational(1, 3).lessThan(new Rational(1, 2))).toBe(true);
      expect(new Rational(1, 2).lessThan(new Rational(1, 3))).toBe(false);
    });

    it('greaterThan works', () => {
      expect(new Rational(2, 3).greaterThan(new Rational(1, 2))).toBe(true);
    });
  });

  describe('predicates', () => {
    it('isInteger', () => {
      expect(new Rational(6, 3).isInteger()).toBe(true);
      expect(new Rational(5, 3).isInteger()).toBe(false);
    });

    it('isZero', () => {
      expect(Rational.zero().isZero()).toBe(true);
      expect(Rational.one().isZero()).toBe(false);
    });
  });

  describe('conversions', () => {
    it('toString integer', () => {
      expect(new Rational(6, 3).toString()).toBe('2');
    });

    it('toString fraction', () => {
      expect(new Rational(1, 3).toString()).toBe('1/3');
    });

    it('toDecimalString', () => {
      expect(new Rational(1, 3).toDecimalString(2)).toBe('0.33');
    });

    it('ceil', () => {
      expect(new Rational(7, 3).ceil()).toBe(3);
    });

    it('floor', () => {
      expect(new Rational(7, 3).floor()).toBe(2);
    });

    it('round', () => {
      expect(new Rational(5, 3).round()).toBe(2);
      expect(new Rational(4, 3).round()).toBe(1);
    });
  });
});
