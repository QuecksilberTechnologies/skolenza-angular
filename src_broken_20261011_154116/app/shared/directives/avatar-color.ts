import {
  Directive,
  ElementRef,
  inject,
  input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';

// No reds: a red avatar beside red status icons reads as an error. The two former red slots hold
// brown and indigo instead of being dropped, so the palette keeps 16 entries and every other
// name keeps the colour it always had.
const AVATAR_COLORS = [
  '#5D4037', // Brown
  '#00796B', // Teal
  '#1976D2', // Blue
  '#388E3C', // Green
  '#F9A825', // Yellow
  '#C2185B', // Pink
  '#7B1FA2', // Purple
  '#0288D1', // Light Blue
  '#F57C00', // Orange
  '#1ABC9C', // Turquoise
  '#1565C0', // Dark Blue
  '#2E7D32', // Dark Green
  '#E65100', // Dark Orange
  '#303F9F', // Indigo
  '#6A1B9A', // Dark Purple
  '#455A64', // Dark Slate
];

/** The letter shown when there is no photo. */
export function avatarInitial(seed: string): string {
  return seed.charAt(0).toUpperCase();
}

/**
 * Same name, same colour, every time - the initial's char code picks the swatch.
 *
 * An empty seed has no char code to hash, so it takes the first swatch rather than
 * indexing the palette with `NaN`.
 */
export function avatarBackgroundColor(seed: string): string {
  const char = avatarInitial(seed);
  if (!char) {
    return AVATAR_COLORS[0];
  }
  return AVATAR_COLORS[char.charCodeAt(0) % AVATAR_COLORS.length];
}

/** Black or white, whichever reads against `hexColor`. */
export function avatarTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Paints the host with {@link avatarBackgroundColor} and writes the initial into it.
 *
 * Writing `textContent` replaces whatever the host rendered, so this cannot be pointed at a
 * component that manages its own DOM and then switched back - see `UserAvatar`, which binds
 * `p-avatar`'s own `label` and `background-color` through these helpers instead.
 */
@Directive({
  selector: '[appAvatarColor]',
})
export class AvatarColor implements OnInit, OnChanges {
  private el = inject(ElementRef);
  readonly appAvatarColor = input<string>('');

  ngOnInit() {
    this.initAvatarColor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appAvatarColor'] && !changes['appAvatarColor'].firstChange) {
      this.initAvatarColor();
    }
  }

  initAvatarColor() {
    const appAvatarColor = this.appAvatarColor();
    if (!appAvatarColor) return;

    const backgroundColor = avatarBackgroundColor(appAvatarColor);

    this.el.nativeElement.style.backgroundColor = backgroundColor;
    this.el.nativeElement.style.color = avatarTextColor(backgroundColor);
    this.el.nativeElement.textContent = avatarInitial(appAvatarColor);
  }
}
