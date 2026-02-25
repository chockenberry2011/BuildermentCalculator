/**
 * Shared color utilities for building count display.
 * Uses HSL interpolation based on fractionSimplicityScore() so that
 * splitter-friendly fractions (0.25, 0.33, 0.5) show as green tones
 * while truly awkward fractions show yellow→red.
 */

/**
 * Map a simplicity score (0–1) to a CSS color string.
 *
 * Score 1.0 (integer):           deep green
 * Score 0.60–0.95 (splitter):    green → yellow-green gradient
 * Score ~0.40 (marginal):        yellow
 * Score 0.10–0.25 (unsplittable): orange → red
 */
export function getCountColor(score: number, isDark: boolean): string {
  // Hue: 0 = red, 40 = orange, 60 = yellow, 142 = green
  const hue = lerp(0, 142, clamp01(score));
  const saturation = isDark ? 70 : 60;
  const lightness = isDark ? 55 : 38;
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Human-readable quality label for the header badge.
 */
export function getQualityLabel(score: number): string {
  if (score >= 1.0) return 'all integer';
  if (score >= 0.80) return 'excellent';
  if (score >= 0.60) return 'good';
  if (score >= 0.40) return 'fair';
  return 'poor';
}

/**
 * Background color for the summary header badge.
 */
export function getBadgeBgColor(score: number, isDark: boolean): { bg: string; text: string } {
  if (score >= 0.80) {
    return isDark
      ? { bg: 'rgba(34,197,94,0.2)', text: 'rgb(134,239,172)' }   // green
      : { bg: 'rgb(220,252,231)', text: 'rgb(22,101,52)' };
  }
  if (score >= 0.60) {
    return isDark
      ? { bg: 'rgba(163,230,53,0.2)', text: 'rgb(190,242,100)' }  // lime
      : { bg: 'rgb(236,252,203)', text: 'rgb(63,98,18)' };
  }
  if (score >= 0.40) {
    return isDark
      ? { bg: 'rgba(234,179,8,0.2)', text: 'rgb(253,224,71)' }    // yellow
      : { bg: 'rgb(254,249,195)', text: 'rgb(113,63,18)' };
  }
  return isDark
    ? { bg: 'rgba(239,68,68,0.2)', text: 'rgb(252,165,165)' }     // red
    : { bg: 'rgb(254,226,226)', text: 'rgb(153,27,27)' };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
