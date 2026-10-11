import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { BirthdayCard } from '@shared/components/dashboad/birthday-card/birthday-card';
import { DashboardCardPlaceholderComponent } from '@shared/components/dashboad/dashboard-card-placeholder/dashboard-card-placeholder.component';
import { DepartmentHeadcountCard } from '@shared/components/dashboad/department-headcount-card/department-headcount-card';
import { StaffMemberStatsCard } from '@shared/components/dashboad/staff-member-stats-card/staff-member-stats-card';
import { HiringPipelineCard } from '@shared/components/dashboad/hiring-pipeline-card/hiring-pipeline-card';
import { NoticePeriodCard } from '@shared/components/dashboad/notice-period-card/notice-period-card';
import { OnLeaveCardComponent } from '@shared/components/dashboad/on-leave-card/on-leave-card.component';
import { OnboardingCard } from '@shared/components/dashboad/onboarding-card/onboarding-card';
import { StorageStatusCard } from '@shared/components/dashboad/storage-status-card/storage-status-card';
import { WidgetListCard } from '@shared/components/dashboad/widget-list-card/widget-list-card';

import { DashboardGreeting } from '../dashboard-greeting/dashboard-greeting';
import { AdminDashboardStatsLoader } from './admin-dashboard-stats-loader/admin-dashboard-stats-loader';
import { AdminDashboardStats } from './admin-dashboard-stats/admin-dashboard-stats';
import { AdminDashboardStore } from './admin-dashboard.store';
import { LocationsCard } from './locations-card/locations-card';

@Component({
  selector: 'app-dashboard-admin',
  imports: [
    AdminDashboardStats,
    AdminDashboardStatsLoader,
    BirthdayCard,
    DashboardCardPlaceholderComponent,
    DashboardGreeting,
    DepartmentHeadcountCard,
    StaffMemberStatsCard,
    HiringPipelineCard,
    LocationsCard,
    NoticePeriodCard,
    OnLeaveCardComponent,
    OnboardingCard,
    StorageStatusCard,
    WidgetListCard,
  ],
  templateUrl: './dashboard-admin.html',
  providers: [AdminDashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardAdmin {
  readonly #commonService = inject(Common);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  protected readonly store = inject(AdminDashboardStore);

  // Attendance configuration has no catalog module of its own, so the Locations screen — and this
  // widget with it — rides the existing `Attendance` key. See `campuses.ts`.
  protected canViewLocations = computed(() =>
    this.#permissionsStore.canAccessOrUnknown('Attendance'),
  );

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Dashboard',
      pageDescription: 'Overview of your staffMembers, hiring activity, and leave statistics.',
      pageIcon: 'pi pi-microsoft',
    });
  }
}
