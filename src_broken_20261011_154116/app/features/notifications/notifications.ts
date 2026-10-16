import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { NotificationStore } from '@core/stores';
import { Notification } from '@shared/interfaces';

type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationGroup {
  type: Notification['type'];
  label: string;
  items: Notification[];
}

const TYPE_LABELS: Record<Notification['type'], string> = {
  system: 'System',
  task: 'Tasks',
  team: 'Team',
  meeting: 'Meetings',
  document: 'Documents',
  alert: 'Alerts',
  reminder: 'Reminders',
};

@Component({
  selector: 'app-notifications',
  imports: [ButtonModule, CardModule, TooltipModule],
  templateUrl: './notifications.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Notifications {
  readonly notificationStore = inject(NotificationStore);
  readonly #commonService = inject(Common);

  readonly filter = signal<NotificationFilter>('all');

  readonly tabs: { label: string; value: NotificationFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
    { label: 'Read', value: 'read' },
  ];

  readonly filtered = computed<Notification[]>(() => {
    const list = this.notificationStore.notifications();
    switch (this.filter()) {
      case 'unread':
        return list.filter((n) => !n.isRead);
      case 'read':
        return list.filter((n) => n.isRead);
      default:
        return list;
    }
  });

  readonly grouped = computed<NotificationGroup[]>(() => {
    const groups = new Map<Notification['type'], Notification[]>();
    for (const n of this.filtered()) {
      const bucket = groups.get(n.type) ?? [];
      bucket.push(n);
      groups.set(n.type, bucket);
    }
    return [...groups.entries()].map(([type, items]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      items,
    }));
  });

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Notifications',
      pageDescription: 'View and manage all your notifications',
      pageIcon: 'pi pi-bell',
      isBreadcrumbShow: false,
    });
  }

  setFilter(value: NotificationFilter): void {
    this.filter.set(value);
  }

  markAllAsRead(): void {
    this.notificationStore.markAllAsRead();
  }

  markRead(event: Event, id: number): void {
    event.stopPropagation();
    this.notificationStore.markAsRead(id);
  }

  remove(event: Event, id: number): void {
    event.stopPropagation();
    this.notificationStore.removeNotification(id);
  }
}
