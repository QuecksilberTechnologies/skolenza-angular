import { TestBed } from '@angular/core/testing';

import { PmsProgressBar } from './pms-progress-bar';
import { PmsRatingStars } from './pms-rating-stars';
import { PmsStatusBadge } from './pms-status-badge';

describe('PMS presentational components', () => {
  it('PmsStatusBadge maps status to label + severity', () => {
    const fixture = TestBed.createComponent(PmsStatusBadge);
    fixture.componentRef.setInput('status', 'InReview');
    fixture.detectChanges();
    expect(fixture.componentInstance['meta']()).toEqual({ label: 'In Review', severity: 'info' });
  });

  it('PmsProgressBar picks a colour bucket by value', () => {
    const fixture = TestBed.createComponent(PmsProgressBar);
    fixture.componentRef.setInput('value', 100);
    fixture.detectChanges();
    expect(fixture.componentInstance['barClass']()).toBe('bg-green-500');

    fixture.componentRef.setInput('value', 20);
    fixture.detectChanges();
    expect(fixture.componentInstance['barClass']()).toBe('bg-red-400');
  });

  it('PmsRatingStars emits a rating when interactive', () => {
    const fixture = TestBed.createComponent(PmsRatingStars);
    fixture.componentRef.setInput('value', 2);
    fixture.componentRef.setInput('readonly', false);
    let emitted = 0;
    fixture.componentInstance.rate.subscribe((v: number) => (emitted = v));
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[3] as HTMLButtonElement).click();
    expect(emitted).toBe(4);
  });

  it('PmsRatingStars renders no buttons when read-only', () => {
    const fixture = TestBed.createComponent(PmsRatingStars);
    fixture.componentRef.setInput('value', 3);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
