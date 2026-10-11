import { PmsStatus } from './pms-common';

export interface ActionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface OneOnOne {
  id: string;
  title: string;
  managerId: string;
  managerName: string;
  staffMemberId: string;
  staffMemberName: string;
  scheduledAt: string; // ISO datetime
  agenda: string;
  notes: string;
  actionItems: ActionItem[];
  nextMeetingAt: string | null; // ISO datetime
  status: PmsStatus;
}
