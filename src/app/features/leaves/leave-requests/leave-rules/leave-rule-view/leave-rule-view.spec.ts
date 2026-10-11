import { ComponentFixture, TestBed } from '@angular/core/testing';

import LeaveRuleView from './leave-rule-view';

describe('LeaveRuleView', () => {
  let component: LeaveRuleView;
  let fixture: ComponentFixture<LeaveRuleView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveRuleView],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveRuleView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
