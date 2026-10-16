import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { Notification } from '@shared/interfaces';

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [
    {
      id: 1,
      type: 'system',
      title: 'System Update',
      message: 'New features have been deployed to the system',
      time: 'Just now',
      isRead: false,
      icon: 'pi pi-bell',
      iconColor: 'text-blue-500 dark:text-blue-300',
      bgColor: 'bg-blue-50/80 dark:bg-blue-400/15',
      borderColor: 'border-blue-100',
    },
    {
      id: 2,
      type: 'task',
      title: 'New Task Assigned',
      message: 'You have been assigned to the Q4 Project Review',
      time: '5m ago',
      isRead: false,
      icon: 'pi pi-list-check',
      iconColor: 'text-purple-500 dark:text-purple-300',
      bgColor: 'bg-purple-50/80 dark:bg-purple-400/15',
      borderColor: 'border-purple-100',
    },
    {
      id: 3,
      type: 'team',
      title: 'Team Update',
      message: 'Sarah Johnson has joined the Development Team',
      time: '15m ago',
      isRead: false,
      icon: 'pi pi-users',
      iconColor: 'text-green-500 dark:text-green-300',
      bgColor: 'bg-green-50/80 dark:bg-green-400/15',
      borderColor: 'border-green-100',
    },
    {
      id: 4,
      type: 'meeting',
      title: 'Meeting Reminder',
      message: 'Quarterly Review Meeting starts in 30 minutes',
      time: '30m ago',
      isRead: true,
      icon: 'pi pi-calendar',
      iconColor: 'text-orange-500 dark:text-orange-300',
      bgColor: 'bg-orange-50/80 dark:bg-orange-400/15',
      borderColor: 'border-orange-100',
    },
    {
      id: 5,
      type: 'document',
      title: 'Document Updated',
      message: 'Project proposal has been updated by Mike Smith',
      time: '1h ago',
      isRead: true,
      icon: 'pi pi-file-edit',
      iconColor: 'text-gray-500 dark:text-gray-300',
      bgColor: 'bg-gray-50/80 dark:bg-gray-400/15',
      borderColor: 'border-gray-100',
    },
  ],
};

export const NotificationStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ notifications }) => ({
    unreadCount: computed(() => notifications().filter((n) => !n.isRead).length),
    hasUnread: computed(() => notifications().some((n) => !n.isRead)),
  })),
  withMethods((store) => ({
    markAllAsRead(): void {
      patchState(store, {
        notifications: store.notifications().map((n) => ({ ...n, isRead: true })),
      });
    },

    markAsRead(id: number): void {
      patchState(store, {
        notifications: store.notifications().map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      });
    },

    addNotification(notification: Notification): void {
      patchState(store, { notifications: [notification, ...store.notifications()] });
    },

    removeNotification(id: number): void {
      patchState(store, { notifications: store.notifications().filter((n) => n.id !== id) });
    },

    setNotifications(notifications: Notification[]): void {
      patchState(store, { notifications });
    },
  })),
);
