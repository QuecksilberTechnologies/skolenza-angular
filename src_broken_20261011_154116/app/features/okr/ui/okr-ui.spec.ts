import { TestBed } from '@angular/core/testing';

import { OkrAverageProgress } from './okr-average-progress';
import { OkrLevelBadge } from './okr-level-badge';
import { OkrProgress } from './okr-progress';
import { OkrStatusTag } from './okr-status-tag';

describe('OKR presentational components', () => {
  it('OkrStatusTag maps status to label + severity', () => {
    const fixture = TestBed.createComponent(OkrStatusTag);
    fixture.componentRef.setInput('status', 'OnTrack');
    fixture.detectChanges();
    expect(fixture.componentInstance['meta']()).toEqual({ label: 'On Track', severity: 'success' });
  });

  it('OkrLevelBadge resolves icon/classes for a level', () => {
    const fixture = TestBed.createComponent(OkrLevelBadge);
    fixture.componentRef.setInput('level', 'Company');
    fixture.detectChanges();
    expect(fixture.componentInstance['meta']().icon).toBe('pi pi-building');
  });

  it('OkrProgress picks a colour bucket by value', () => {
    const fixture = TestBed.createComponent(OkrProgress);
    fixture.componentRef.setInput('value', 100);
    fixture.detectChanges();
    expect(fixture.componentInstance['barClass']()).toBe('from-emerald-400 to-emerald-500');

    fixture.componentRef.setInput('value', 20);
    fixture.detectChanges();
    expect(fixture.componentInstance['barClass']()).toBe('from-red-400 to-red-500');
  });

  it('OkrAverageProgress hides Team/New OKR quick-actions when canManage is false', () => {
    const fixture = TestBed.createComponent(OkrAverageProgress);
    fixture.componentRef.setInput('progress', 50);
    fixture.componentRef.setInput('objectiveCount', 3);
    fixture.componentRef.setInput('canManage', false);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('My OKRs');
    expect(text).toContain('Company OKRs');
    expect(text).not.toContain('Team OKRs');
    expect(text).not.toContain('New OKR');

    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
    const managed = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(managed).toContain('Team OKRs');
    expect(managed).toContain('New OKR');
  });
});
