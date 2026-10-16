import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveGraphCardComponent } from './leave-graph-card.component';

describe('LeaveGraphCardComponent', () => {
  let component: LeaveGraphCardComponent;
  let fixture: ComponentFixture<LeaveGraphCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveGraphCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveGraphCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
