import { OneOnOne, PmsStatus } from '@shared/interfaces';

export interface MeetingFormModel {
  title: string;
  staffMemberName: string;
  scheduledAt: Date | null;
  agenda: string;
  notes: string;
  nextMeetingAt: Date | null;
  status: PmsStatus;
}

export function emptyMeetingForm(): MeetingFormModel {
  return {
    title: '',
    staffMemberName: '',
    scheduledAt: null,
    agenda: '',
    notes: '',
    nextMeetingAt: null,
    status: 'Draft',
  };
}

export function meetingToForm(m: OneOnOne): MeetingFormModel {
  return {
    title: m.title,
    staffMemberName: m.staffMemberName,
    scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : null,
    agenda: m.agenda,
    notes: m.notes,
    nextMeetingAt: m.nextMeetingAt ? new Date(m.nextMeetingAt) : null,
    status: m.status,
  };
}

export function formToMeeting(model: MeetingFormModel, base?: OneOnOne): OneOnOne {
  return {
    id: base?.id ?? `o-${Date.now()}`,
    title: model.title.trim(),
    managerId: base?.managerId ?? 'm-201',
    managerName: base?.managerName ?? 'Meera Nair',
    staffMemberId: base?.staffMemberId ?? `e-${model.staffMemberName.toLowerCase().replace(/\s+/g, '-')}`,
    staffMemberName: model.staffMemberName.trim(),
    scheduledAt: model.scheduledAt ? model.scheduledAt.toISOString() : '',
    agenda: model.agenda.trim(),
    notes: model.notes.trim(),
    actionItems: base?.actionItems ?? [],
    nextMeetingAt: model.nextMeetingAt ? model.nextMeetingAt.toISOString() : null,
    status: model.status,
  };
}
