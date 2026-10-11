import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceStats } from './attendance-stats';

describe('AttendanceStats', () => {
  let component: AttendanceStats;
  let fixture: ComponentFixture<AttendanceStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceStats],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceStats);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('stats', {
      present: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      total: 0,
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
