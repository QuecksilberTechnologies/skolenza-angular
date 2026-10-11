import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { ITicketDetail } from '../../models';
import { TicketsStore } from '../../tickets.store';
import { PropertyPickerCell, PropertyOption } from '../property-picker-cell/property-picker-cell';

@Component({
  selector: 'app-ticket-details-header',
  imports: [ButtonModule, DatePipe, PropertyPickerCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-details-header.html',
})
export class TicketDetailsHeader {
  readonly store = inject(TicketsStore);
  readonly detail = input.required<ITicketDetail>();
  readonly editClick = output<void>();
  readonly copyLinkClick = output<void>();

  protected readonly statusOptions: PropertyOption[] = [
    {
      value: 'Open',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-blue-500',
    },
    {
      value: 'Pending',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-amber-500',
    },
    {
      value: 'Solved',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
    },
    {
      value: 'Reopened',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-red-500',
    },
    {
      value: 'On Hold',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-zinc-400',
    },
  ];

  protected readonly priorityOptions: PropertyOption[] = [
    {
      value: 'Low',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-blue-500',
    },
    {
      value: 'Medium',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-amber-500',
    },
    {
      value: 'High',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-red-500',
    },
    {
      value: 'Urgent',
      pillClass:
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      dotClass: 'w-1.5 h-1.5 rounded-full bg-red-500',
    },
  ];
}
