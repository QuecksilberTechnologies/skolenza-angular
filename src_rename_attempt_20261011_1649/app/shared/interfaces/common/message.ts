export type ToastTypes =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'error'
  | 'secondary'
  | 'contrast';

export type MessageCategory = 'direct' | 'group' | 'project' | 'announcement';

export interface Message {
  id: number;
  sender: {
    id: number;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    role?: string;
  };
  content: string;
  time: string;
  isRead: boolean;
  type: 'text' | 'image' | 'file';
  category: MessageCategory;
  priority?: 'high' | 'medium' | 'low';
  attachments?: {
    type: 'image' | 'file';
    name: string;
    url: string;
    size?: string;
    thumbnail?: string;
  }[];
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}
