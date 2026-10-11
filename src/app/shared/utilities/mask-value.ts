/**
 * Hides all but the first `visible` characters behind `*`, keeping the length so the reveal
 * animation in `ProfileInfoBlock` swaps character for character.
 */
export function maskValue(value: string | null | undefined, visible = 2): string | null {
  if (!value) return value ?? null;
  return value.slice(0, visible) + '*'.repeat(Math.max(0, value.length - visible));
}
