import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { AvatarGroupModule } from '@openng/optimus-ui/avatargroup';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import {
  CalendarDays,
  ChartGantt,
  KanbanSquare,
  LayoutDashboard,
  List,
  LucideAngularModule,
} from 'lucide-angular';
import { delay, finalize, map } from 'rxjs';

import { ProjectsApi } from '@core/services';
import { SubHeader } from '@shared/components/sub-header/sub-header';
import { AvatarColor } from '@shared/directives';
import { Project } from '@shared/interfaces';

import { ProjectBoardStore } from '../project-board.store';

@Component({
  selector: 'app-project-views',
  imports: [
    RouterModule,
    TabsModule,
    ButtonModule,
    LucideAngularModule,
    TooltipModule,
    AvatarGroupModule,
    AvatarModule,
    SkeletonModule,
    // GetFirstWordPipe,
    AvatarColor,
    SubHeader,
  ],
  templateUrl: './project-views.component.html',
  providers: [ProjectBoardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProjectViewsComponent implements OnInit {
  readonly #projectsApi = inject(ProjectsApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly router = inject(Router);
  readonly activatedRoute = inject(ActivatedRoute);
  readonly project = signal<Project | null>(null);
  readonly projectId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly activeTabIndex = signal('overview');
  readonly activePage = signal('overview');

  readonly tabs = [
    { label: 'Overview', route: 'overview', icon: LayoutDashboard },
    { label: 'List', route: 'list', icon: List },
    { label: 'Board', route: 'board', icon: KanbanSquare },
    { label: 'Schedule', route: 'schedule', icon: CalendarDays },
    { label: 'Timeline', route: 'timeline', icon: ChartGantt },
  ];

  ngOnInit() {
    this.setCurrentPage(this.router.url);
    this.router.events.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (event) => {
        if (event instanceof NavigationEnd) {
          this.setCurrentPage(event.urlAfterRedirects);
        }
      },
    });

    // Get project ID from route params
    this.activatedRoute.params.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (params) => {
        this.projectId.set(params['id']);
        this.loadProject();
      },
    });
  }

  setCurrentPage(path: string) {
    const currentPage = path.split('/').pop() || 'overview';
    this.activePage.set(currentPage);
    this.activeTabIndex.set(this.activePage());
  }

  private loadProject() {
    const projects = this.#projectsApi.getProjects();
    const projectId = this.projectId();

    const project = projects.find((p) => p.id.toString() === projectId);
    this.project.set(project ?? null);

    if (projects.length === 0) {
      this.initProjects();
    }
  }

  initProjects() {
    this.isLoading.set(true);
    this.#projectsApi
      .fetchProjects()
      .pipe(
        delay(500),
        finalize(() => {
          this.isLoading.set(false);
        }),
        map((res) =>
          res.isSucceeded
            ? res.data.map((project) => ({
                ...project,
                startDate: new Date(project.startDate),
                endDate: new Date(project.endDate),
              }))
            : [],
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.#projectsApi.setProjects(data);

          const projects = this.#projectsApi.getProjects();
          const projectId = this.projectId();
          const project = projects.find((p) => p.id.toString() === projectId);
          this.project.set(project ?? null);
        },
      });
  }
}
