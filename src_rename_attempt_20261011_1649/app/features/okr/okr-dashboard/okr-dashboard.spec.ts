import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { IOkr, SettledSearchTerm } from '@shared/interfaces';

import { OkrStore } from '../okr.store';
import OkrDashboard from './okr-dashboard';

const okrs = [
  { id: '1', department: 'Engineering', progress: 80, status: 'OnTrack' },
  { id: '2', department: 'Engineering', progress: 40, status: 'Behind' },
  { id: '3', department: 'Sales', progress: 60, status: 'Active' },
] as IOkr[];

describe('OkrDashboard', () => {
  let component: OkrDashboard;
  let fixture: ComponentFixture<OkrDashboard>;
  let storeMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    storeMock = {
      okrs: vi.fn().mockReturnValue(okrs),
      isLoading: vi.fn().mockReturnValue(false),
      stats: vi
        .fn()
        .mockReturnValue({ active: 2, completed: 0, onTrack: 1, atRisk: 1, overdue: 0 }),
      appliedFilters: vi.fn().mockReturnValue(null),
      setScope: vi.fn(),
      loadOkrs: vi.fn(),
      setSearchTerm: vi.fn(),
      updateAppliedFilters: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OkrDashboard],
    })
      .overrideComponent(OkrDashboard, {
        set: { providers: [{ provide: OkrStore, useValue: storeMock }] },
      })
      .overrideProvider(Common, { useValue: { setPageHeaderInfo: vi.fn() } })
      .overrideProvider(Router, { useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } })
      .compileComponents();

    fixture = TestBed.createComponent(OkrDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the full set in team scope on init', () => {
    expect(storeMock['setScope']).toHaveBeenCalledWith('team');
    expect(storeMock['loadOkrs']).toHaveBeenCalled();
  });

  it('computes average progress across loaded OKRs', () => {
    // (80 + 40 + 60) / 3 = 60
    expect(component.avgProgress()).toBe(60);
  });

  it('groups average progress by department for the bar chart', () => {
    const data = component.departmentChartData();
    expect(data.labels).toEqual(['Engineering', 'Sales']);
    expect(data.datasets[0].data).toEqual([60, 60]); // Eng (80+40)/2=60, Sales 60
  });

  it('onSearch delegates to the store', () => {
    component.onSearch('x' as SettledSearchTerm);
    expect(storeMock['setSearchTerm']).toHaveBeenCalledWith('x');
  });
});
