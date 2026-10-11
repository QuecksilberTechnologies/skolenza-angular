import { ComponentFixture, TestBed } from '@angular/core/testing';

import StaffMemberStats from './staff-member-stats';

describe('StaffMemberStats', () => {
  let component: StaffMemberStats;
  let fixture: ComponentFixture<StaffMemberStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberStats],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
