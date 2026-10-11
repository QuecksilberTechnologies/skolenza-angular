import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Common } from '@core/services';
import { AnniversaryCardComponent } from '@shared/components/dashboad/anniversary-card/anniversary-card.component';
import { AttendanceCardComponent } from '@shared/components/dashboad/attendance-card/attendance-card.component';
import { CalendarCardComponent } from '@shared/components/dashboad/calendar-card/calendar-card.component';
import { DashboardCardPlaceholderComponent } from '@shared/components/dashboad/dashboard-card-placeholder/dashboard-card-placeholder.component';
import { LeaveGraphCardComponent } from '@shared/components/dashboad/leave-graph-card/leave-graph-card.component';
import { MetricsCard } from '@shared/components/dashboad/metrics-card/metrics-card';
import { OccasionsCardComponent } from '@shared/components/dashboad/occasions-card/occasions-card.component';
import { OnLeaveCardComponent } from '@shared/components/dashboad/on-leave-card/on-leave-card.component';
import { ProjectsStatsCardComponent } from '@shared/components/dashboad/projects-stats-card/projects-stats-card.component';
import { RequestStatusCardComponent } from '@shared/components/dashboad/request-status-card/request-status-card.component';
import { WidgetListCard } from '@shared/components/dashboad/widget-list-card/widget-list-card';

import { DashboardGreeting } from '../dashboard-greeting/dashboard-greeting';
import { WorkforceDashboardStore } from './workforce-dashboard.store';

@Component({
  selector: 'app-dashboard',
  imports: [
    AttendanceCardComponent,
    LeaveGraphCardComponent,
    CalendarCardComponent,
    AnniversaryCardComponent,
    OnLeaveCardComponent,
    OccasionsCardComponent,
    RequestStatusCardComponent,
    DashboardCardPlaceholderComponent,
    ProjectsStatsCardComponent,
    DashboardGreeting,
    MetricsCard,
    WidgetListCard,
  ],
  providers: [DatePipe, WorkforceDashboardStore],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardStaffMember {
  readonly #commonService = inject(Common);
  readonly #datePipe = inject(DatePipe);
  protected readonly store = inject(WorkforceDashboardStore);

  readonly attendanceTitle = 'Attendance | Sat';
  readonly leaveGraphTitle = 'Leave | By Graph';
  readonly calendarTitle = 'Calendar | All Month';
  readonly anniversaryTitle = 'Anniversary | Teams';
  readonly onLeaveTitle = 'StaffMember | On Leave';
  readonly occasionsTitle = `Occasions | ${this.#datePipe.transform(new Date(), 'MMM')}`;
  readonly requestStatusTitle = 'Request Status | Today';
  readonly projectTitle = 'Projects Stats';

  constructor() {
    // Page Header Info
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Dashboard',
      pageDescription: 'Overview of your attendance, leaves, and events.',
      pageIcon: 'pi pi-id-card',
      isBreadcrumbShow: false,
    });
  }
}
