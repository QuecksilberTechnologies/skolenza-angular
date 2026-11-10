/**
 * Whole-number share of `part` in `whole`, clamped to 0-100 for progress bars and
 * `aria-valuenow`. Floors rather than rounds so a bar never reads 100% while anything is still
 * outstanding (99.5% shows as 99%). A zero or negative `whole` yields 0.
 */
export function percentOf(part: number, whole: number): number {
  if (!(whole > 0)) return 0;
  return Math.min(100, Math.max(0, Math.floor((part / whole) * 100)));
}
