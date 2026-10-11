import { Pipe, PipeTransform } from '@angular/core';

/**
 * A holiday `icon` as a renderable PrimeIcons class, else `null`. Only PrimeIcons load, but the
 * backend seeds Bootstrap classes (`bi bi-calendar-event`); rendering those gives an empty `<i>`
 * that still takes a flex gap and pushes the holiday name off its column. Display-only: the stored
 * value is left as the API sent it, so an edit and save keeps it.
 */
@Pipe({
  name: 'primeIcon',
})
export class PrimeIconPipe implements PipeTransform {
  transform(icon: string | null | undefined): string | null {
    const trimmed = icon?.trim() ?? '';
    const classes = trimmed.split(/\s+/);
    return classes.includes('pi') && classes.some((c) => c.startsWith('pi-')) ? trimmed : null;
  }
}
