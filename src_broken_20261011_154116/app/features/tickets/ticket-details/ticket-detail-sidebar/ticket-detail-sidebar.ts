import { Menu, MenuTrigger } from '@angular/aria/menu';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Popup } from '@shared/index';

import { ITicketDetail } from '../../models';
import { AssignTicketPopup } from '../../ticket-lists/assign-ticket-popup/assign-ticket-popup';
import { TicketsStore } from '../../tickets.store';
import { PropertyPickerCell, PropertyOption } from '../property-picker-cell/property-picker-cell';

@Component({
  selector: 'app-ticket-detail-sidebar',
  imports: [
    UserAvatar,
    DatePipe,
    TooltipModule,
    OverlayModule,
    Menu,
    MenuTrigger,
    Popup,
    PropertyPickerCell,
    AssignTicketPopup,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-detail-sidebar.html',
})
export class TicketDetailSidebar {
  readonly store = inject(TicketsStore);
  readonly detail = input.required<ITicketDetail>();

  protected readonly assigneeMenuRef = viewChild<Menu<unknown>>(Menu);
  protected readonly closeOnScroll = inject(Overlay).scrollStrategies.close();

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

  protected readonly slaConsumedPercent = computed(() => {
    const { slaTotalHours, slaRemainingHours } = this.detail();
    if (!slaTotalHours) return 0;
    const consumed = ((slaTotalHours - slaRemainingHours) / slaTotalHours) * 100;
    return Math.max(0, Math.min(100, Math.round(consumed)));
  });

  protected readonly slaBarColor = computed(() => {
    const pct = this.slaConsumedPercent();
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  });

  protected readonly slaTooltip = computed(() => {
    const { slaTotalHours, slaRemainingHours } = this.detail();
    return `Resolve within ${slaTotalHours}h · ${slaRemainingHours}h remaining`;
  });
}
