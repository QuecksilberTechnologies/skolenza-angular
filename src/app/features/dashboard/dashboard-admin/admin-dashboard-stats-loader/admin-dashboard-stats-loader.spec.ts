import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDashboardStatsLoader } from './admin-dashboard-stats-loader';

describe('AdminDashboardStatsLoader', () => {
  let component: AdminDashboardStatsLoader;
  let fixture: ComponentFixture<AdminDashboardStatsLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardStatsLoader],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardStatsLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
