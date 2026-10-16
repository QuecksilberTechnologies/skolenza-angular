import { ComponentFixture, TestBed } from '@angular/core/testing';

import TicketStats from './ticket-stats';

describe('TicketStats', () => {
  let component: TicketStats;
  let fixture: ComponentFixture<TicketStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketStats],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
