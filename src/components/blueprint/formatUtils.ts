import { Rational } from '../../core/math/rational';

export function formatCount(count: Rational): { text: string; isInteger: boolean } {
  const value = count.toNumber();
  const isInteger = count.isInteger() || Math.abs(value - Math.round(value)) < 0.001;
  if (isInteger) {
    return { text: Math.round(value).toString(), isInteger: true };
  }
  return { text: value.toFixed(2), isInteger: false };
}

export function formatRate(rate: Rational): string {
  const value = rate.toNumber();
  if (Math.abs(value - Math.round(value)) < 0.01) {
    return Math.round(value).toString();
  }
  return value.toFixed(2);
}
