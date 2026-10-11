import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeaveBreakdownCard } from './leave-breakdown-card';

describe('LeaveBreakdownCard', () => {
  let component: LeaveBreakdownCard;
  let fixture: ComponentFixture<LeaveBreakdownCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveBreakdownCard],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveBreakdownCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
