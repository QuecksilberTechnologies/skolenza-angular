import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { DashboardCardPlaceholderComponent } from '@shared/components/dashboad/dashboard-card-placeholder/dashboard-card-placeholder.component';
import { ProjectBurndown } from '@shared/components/dashboad/project-burndown/project-burndown';
import { ProjectsStatsCardComponent } from '@shared/components/dashboad/projects-stats-card/projects-stats-card.component';
import { RequestStatusCardComponent } from '@shared/components/dashboad/request-status-card/request-status-card.component';

@Component({
  selector: 'app-project-overview',
  imports: [
    RequestStatusCardComponent,
    ProjectsStatsCardComponent,
    ProjectBurndown,
    DashboardCardPlaceholderComponent,
    TranslatePipe,
  ],
  templateUrl: './project-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProjectOverviewComponent {}
