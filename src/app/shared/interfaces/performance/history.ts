export type HistoryEventType = 'Review' | 'Promotion' | 'Achievement' | 'Award' | 'Feedback';

export interface HistoryEvent {
  id: string;
  staffMemberId: string;
  staffMemberName: string;
  type: HistoryEventType;
  title: string;
  description: string;
  date: string; // ISO yyyy-MM-dd
}
