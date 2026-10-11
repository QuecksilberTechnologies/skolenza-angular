export type FeedbackType = 'Appreciation' | 'Suggestion';
export type FeedbackVisibility = 'Public' | 'Private';

export interface Feedback {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  type: FeedbackType;
  visibility: FeedbackVisibility;
  message: string;
  createdAt: string; // ISO datetime
}
