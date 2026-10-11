import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnLeaveCardComponent } from './on-leave-card.component';

describe('OnLeaveCardComponent', () => {
  let component: OnLeaveCardComponent;
  let fixture: ComponentFixture<OnLeaveCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnLeaveCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OnLeaveCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps its sample rows when no leaves are bound', () => {
    expect(fixture.nativeElement.textContent).toContain('Amit Sharma');
  });

  it('lists the bound leaves with their date range', async () => {
    fixture.componentRef.setInput('leaves', [
      {
        staffMemberId: 'enc-1',
        staffMemberName: 'Ravi Kumar',
        departmentName: 'Finance',
        fromDate: '2026-10-03',
        toDate: '2026-10-06',
        mobileNumber: '9876543210',
      },
    ]);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ravi Kumar');
    expect(text).toContain('3 Oct 2026 - 6 Oct 2026');
    expect(text).not.toContain('Amit Sharma');
  });

  it('shows a skeleton instead of the empty state while loading', async () => {
    fixture.componentRef.setInput('leaves', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.animate-pulse')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Nobody is on leave today');
  });

  it('shows an empty state when nobody is on leave', async () => {
    fixture.componentRef.setInput('leaves', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Nobody is on leave today');
  });
});
