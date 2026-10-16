import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { RoleDashboardApi, SuperAdminDashboardApi } from '@core/services';

import DashboardAdmin from './dashboard-admin';

const empty = () => of({ isSucceeded: true, message: '', errors: [], data: null });

describe('DashboardAdmin', () => {
  let component: DashboardAdmin;
  let fixture: ComponentFixture<DashboardAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardAdmin],
      providers: [
        MessageService,
        DatePipe,
        { provide: RoleDashboardApi, useValue: { getDashboard: empty } },
        {
          provide: SuperAdminDashboardApi,
          useValue: {
            getSummary: empty,
            getStaffMemberOverview: empty,
            getBirthdays: empty,
            getOnboarding: empty,
            getDepartmentHeadcount: empty,
            getCurrentlyOnLeave: empty,
            getLocations: empty,
            getStorage: empty,
            getHiringPipeline: empty,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
