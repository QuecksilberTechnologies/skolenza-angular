import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';

import DashboardHost from './dashboard-host';

describe('DashboardHost', () => {
  let component: DashboardHost;
  let fixture: ComponentFixture<DashboardHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardHost],
      providers: [
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardHost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose four KPI cards that read zero before data arrives', () => {
    const cards = component.kpiCards();
    expect(cards).toHaveLength(4);
    expect(cards.every((card) => card.value === 0)).toBe(true);
  });
});
