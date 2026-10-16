import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { HolidayCalendarStyle } from '@shared/interfaces';
import { contrastRatio, mixHex } from '@shared/utilities/color';

export type HolidayBadgeKind = 'mandatory' | 'optional' | 'next' | 'today';

/** WCAG AA minimum for normal-size text; the badge text is `text-xs`. */
const MIN_TEXT_CONTRAST = 4.5;

/**
 * Bases the tint is blended against: the plain card (`bg-white` / `dark:bg-zinc-800`). Other
 * surfaces (the Today card, table rows) only shift the pill's look, not its contrast: the badge
 * background is opaque, and contrast is checked text against that background.
 */
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#27272a';

/** Share of the API colour in each part of the tint; the rest is the base named alongside. */
const LIGHT_TEXT_WEIGHT = 0.55; // over black
const LIGHT_BG_WEIGHT = 0.1; // over LIGHT_SURFACE
const DARK_TEXT_WEIGHT = 0.45; // over white
const DARK_BG_WEIGHT = 0.2; // over DARK_SURFACE

/**
 * CSS custom properties for a soft pill in `color`: a faint tint behind a deepened (light) or
 * lightened (dark) text of it, like the built-in tones. `null` when either theme's pair would miss
 * WCAG AA, so the caller falls back to the built-in tone.
 */
function tintVars(color: string): string | null {
  const fg = mixHex(color, '#000000', LIGHT_TEXT_WEIGHT);
  const bg = mixHex(color, LIGHT_SURFACE, LIGHT_BG_WEIGHT);
  const darkFg = mixHex(color, '#ffffff', DARK_TEXT_WEIGHT);
  const darkBg = mixHex(color, DARK_SURFACE, DARK_BG_WEIGHT);
  const readable = (a: string | null, b: string | null) =>
    !!a && !!b && (contrastRatio(a, b) ?? 0) >= MIN_TEXT_CONTRAST;
  return readable(fg, bg) && readable(darkFg, darkBg)
    ? `--badge-fg:${fg};--badge-bg:${bg};--badge-fg-dark:${darkFg};--badge-bg-dark:${darkBg}`
    : null;
}

const BADGES: Record<HolidayBadgeKind, { label: string; tone: string }> = {
  mandatory: {
    label: 'Mandatory',
    tone: 'bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30',
  },
  optional: {
    label: 'Optional',
    tone: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30',
  },
  next: {
    label: 'Next up',
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-500/30',
  },
  today: {
    label: 'Today',
    tone: 'bg-primary-50 text-primary-700 ring-primary-600/20 dark:bg-primary-900/30 dark:text-primary-200 dark:ring-primary-400/30',
  },
};

/**
 * One pill style for the Mandatory, Optional, Next up and Today markers, shared by card and table.
 * An `apiStyle` from `GET /Holiday/calendar-display-constants` supplies the label and the hue of a
 * soft tint, never a solid fill; its `textColor` is unused, since the tint derives its own text.
 * When that tint misses WCAG AA, the built-in tone and label stay.
 */
@Component({
  selector: 'app-holiday-badge',
  template: `
    {{ label() }}
  `,
  host: {
    '[class]':
      "'inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ring-1 ring-inset ' + (tint() ? 'bg-(--badge-bg) text-(--badge-fg) ring-current/20 dark:bg-(--badge-bg-dark) dark:text-(--badge-fg-dark)' : badge().tone)",
    '[style]': 'tint()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayBadge {
  readonly kind = input.required<HolidayBadgeKind>();
  readonly apiStyle = input<HolidayCalendarStyle | null>(null);
  protected readonly badge = computed(() => BADGES[this.kind()]);
  /** Tint of `apiStyle` when readable in both themes, else `null` (built-in tone). */
  protected readonly tint = computed(() => {
    const s = this.apiStyle();
    return s ? tintVars(s.backgroundColor) : null;
  });
  /** The API label goes with the API colour; "holiday" is dropped as the pill always marks one. */
  protected readonly label = computed(() => {
    const s = this.apiStyle();
    return s && this.tint() ? s.label.replace(/\s+holiday$/i, '') : this.badge().label;
  });
}
