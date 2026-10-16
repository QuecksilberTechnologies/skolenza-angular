import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A PrimeIcons class, as opposed to a path, a URL or an empty field. */
const PRIME_ICON = /^pi(\s|$)/;

/**
 * Decorative icon tile for a grid row. The icon fields behind it (`iconURL`, `iconImage`) are free
 * text, so anything that is not a PrimeIcons class would bind an unknown class name — those rows
 * fall back to a generic icon instead. The row's own name carries the accessible text.
 */
@Component({
  selector: 'app-icon-tile',
  templateUrl: './icon-tile.html',
  host: { class: 'inline-flex' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconTile {
  readonly icon = input.required<string | null | undefined>();
  readonly fallback = input('pi pi-folder');

  protected readonly resolved = computed(() => {
    const icon = this.icon()?.trim() ?? '';
    return PRIME_ICON.test(icon) ? icon : this.fallback();
  });
}
