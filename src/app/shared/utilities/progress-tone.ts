/**
 * The single source of truth for profile-completion colour: one set of thresholds, three
 * renderings of the same band, so every progress indicator in the app agrees.
 *
 * Light theme uses the `-700` stops (`-600` for red): >= 4.83:1 as text on white and >= 3.53:1 as a
 * stroke or bar on white, a `zinc-200` track and `zinc-900`. Dark theme text and bars use `-400`.
 * `stroke` is one hex for both themes because `p-knob` takes a single colour. Still never let a
 * tone be the *only* thing carrying the value - pair it with the percentage, a label, or an icon.
 */
export interface ProgressTone {
  /** Hex, for APIs that take a colour string only - `p-knob`, SVG `stroke`. */
  stroke: string;
  /** Tailwind text classes for the percentage itself. */
  text: string;
  /** Tailwind bar-fill classes, over a `zinc-200` / `zinc-700` track. */
  bar: string;
}

const COMPLETE: ProgressTone = {
  stroke: '#15803d',
  text: 'text-green-700 dark:text-green-400',
  bar: 'bg-green-700 dark:bg-green-400',
};

const PARTIAL: ProgressTone = {
  stroke: '#b45309',
  text: 'text-amber-700 dark:text-amber-400',
  bar: 'bg-amber-700 dark:bg-amber-400',
};

const INCOMPLETE: ProgressTone = {
  stroke: '#dc2626',
  text: 'text-red-600 dark:text-red-400',
  bar: 'bg-red-600 dark:bg-red-400',
};

export function progressTone(completionPercentage: number): ProgressTone {
  if (typeof completionPercentage !== 'number' || isNaN(completionPercentage)) {
    return INCOMPLETE;
  }

  if (completionPercentage >= 80) {
    return COMPLETE;
  }

  if (completionPercentage >= 70) {
    return PARTIAL;
  }

  return INCOMPLETE;
}
