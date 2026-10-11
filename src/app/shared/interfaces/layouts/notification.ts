export interface Notification {
  id: number;
  type: 'system' | 'task' | 'team' | 'meeting' | 'document' | 'alert' | 'reminder';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}
