import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonField } from './form-skeleton-field';

describe('SkeletonField', () => {
  let fixture: ComponentFixture<SkeletonField>;

  function bars(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('p-skeleton'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SkeletonField] }).compileComponents();

    fixture = TestBed.createComponent(SkeletonField);
  });

  it('draws a label bar over a control bar', () => {
    fixture.detectChanges();

    expect(bars()).toHaveLength(2);
    expect(fixture.componentInstance['controlHeight']()).toBe('2.65rem');
  });

  it('sizes the control bar from the real textarea rows', () => {
    fixture.componentRef.setInput('control', 'textarea');
    fixture.componentRef.setInput('textareaRows', 3);
    fixture.detectChanges();

    expect(fixture.componentInstance['controlHeight']()).toBe('5.65rem');
  });

  it('reserves the drawer error slot without drawing a bar', () => {
    fixture.componentRef.setInput('slot', true);
    fixture.detectChanges();

    expect(bars()).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.min-h-5')).toBeTruthy();
  });

  it('draws a hint bar on a plain line when no slot is reserved', () => {
    fixture.componentRef.setInput('hint', true);
    fixture.detectChanges();

    expect(bars()).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.min-h-5')).toBeNull();
    expect(fixture.nativeElement.querySelector('.h-4 p-skeleton')).toBeTruthy();
  });

  it('puts the hint bar inside the reserved slot when both are set', () => {
    fixture.componentRef.setInput('hint', true);
    fixture.componentRef.setInput('slot', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.min-h-5 p-skeleton')).toBeTruthy();
  });
});
