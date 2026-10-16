import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { Holiday, HolidayTypeStyles } from '@shared/interfaces';

import { HolidayBadge } from '../holiday-badge/holiday-badge';
import { PrimeIconPipe } from '../prime-icon-pipe';

@Component({
  selector: 'app-holiday-card',
  imports: [DatePipe, HolidayBadge, PrimeIconPipe, TableActionButton],
  templateUrl: './holiday-card.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayCard {
  readonly holiday = input.required<Holiday>();
  readonly isPast = input(false);
  readonly isNext = input(false);
  readonly isToday = input(false);
  /** Hidden when every holiday shares one location — the same line on every card is noise. */
  readonly showLocation = input(true);
  /** API palette for the type badge; `null` entries keep the badge's built-in tone. */
  readonly typeStyles = input<HolidayTypeStyles>({ mandatory: null, optional: null });
  /** Overflow button click — the parent owns the menu, so it needs the anchor event. */
  readonly action = output<{ event: Event; holiday: Holiday }>();
  readonly view = output<Holiday>();
}
