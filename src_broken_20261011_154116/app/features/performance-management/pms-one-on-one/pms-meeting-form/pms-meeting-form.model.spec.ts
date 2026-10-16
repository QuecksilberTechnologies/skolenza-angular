import { OneOnOne } from '@shared/interfaces';

import { emptyMeetingForm, formToMeeting, meetingToForm } from './pms-meeting-form.model';

const sampleMeeting: OneOnOne = {
  id: 'o-1',
  title: 'Weekly sync',
  managerId: 'm-1',
  managerName: 'Meera',
  staffMemberId: 'e-1',
  staffMemberName: 'Jane',
  scheduledAt: '2026-06-25T10:00:00Z',
  agenda: 'agenda',
  notes: 'notes',
  actionItems: [{ id: 'a-1', text: 'do', done: false }],
  nextMeetingAt: '2026-07-02T10:00:00Z',
  status: 'Completed',
};

describe('pms-meeting-form.model', () => {
  it('emptyMeetingForm has null dates and Draft status', () => {
    const form = emptyMeetingForm();
    expect(form.scheduledAt).toBeNull();
    expect(form.nextMeetingAt).toBeNull();
    expect(form.status).toBe('Draft');
  });

  it('meetingToForm parses ISO datetimes to Date', () => {
    const form = meetingToForm(sampleMeeting);
    expect(form.scheduledAt).toBeInstanceOf(Date);
    expect(form.nextMeetingAt).toBeInstanceOf(Date);
  });

  it('formToMeeting preserves base action items and ids on edit', () => {
    const result = formToMeeting(meetingToForm(sampleMeeting), sampleMeeting);
    expect(result.id).toBe('o-1');
    expect(result.actionItems).toHaveLength(1);
    expect(result.managerName).toBe('Meera');
  });

  it('formToMeeting leaves nextMeetingAt null when unset', () => {
    const form = meetingToForm(sampleMeeting);
    form.nextMeetingAt = null;
    const result = formToMeeting(form, sampleMeeting);
    expect(result.nextMeetingAt).toBeNull();
  });
});
