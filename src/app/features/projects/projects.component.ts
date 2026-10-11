import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { AvatarGroupModule } from '@openng/optimus-ui/avatargroup';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { SelectChangeEvent } from '@openng/optimus-ui/select';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { delay, finalize, map } from 'rxjs';

import { Common, ProjectsApi } from '@core/services';
import { StatusDotSelect } from '@shared/components/status-dot-select/status-dot-select';
import { AvatarColor } from '@shared/directives';
import {
  TableActionButton,
  TableEmptyMessage,
  TableInlineFilters,
  TableLoader,
  TableSearchFilter,
  TableSearchInput,
} from '@shared/index';
import { Project } from '@shared/interfaces';

import NewProjectDialog from './new-project-dialog/new-project-dialog';

interface ProjectOption {
  label: string;
  value: string;
  color: string;
}

@Component({
  selector: 'app-projects',
  imports: [
    TableModule,
    ButtonModule,
    StatusDotSelect,
    ReactiveFormsModule,
    CardModule,
    ConfirmDialogModule,
    ProgressBarModule,
    AvatarGroupModule,
    AvatarColor,
    AvatarModule,
    RouterModule,
    TooltipModule,
    MenuModule,
    ContextMenuModule,
    DatePipe,
    TableLoader,
    TableEmptyMessage,
    TableSearchFilter,
    TableSearchInput,
    TableInlineFilters,
    TableActionButton,
    TagModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './projects.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProjectsComponent implements OnInit {
  readonly #projectsApi = inject(ProjectsApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #http = inject(HttpClient);
  readonly #staffMemberNames = signal<Map<string, string>>(new Map());
  readonly selectedStatus = signal<string | null>(null);
  readonly selectedPriority = signal<string | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly isLoading = signal(false);
  protected selectedRow!: Project;
  protected actionMenuItems: MenuItem[] = [];

  /** Backs the inline status/priority filters; not submitted anywhere. */
  protected readonly filterForm = new FormGroup({
    status: new FormControl<string | null>(null),
    priority: new FormControl<string | null>(null),
  });

  readonly statusOptions: ProjectOption[] = [
    { label: 'Active', value: 'active', color: 'text-blue-400' },
    { label: 'Completed', value: 'completed', color: 'text-green-400' },
    { label: 'On Hold', value: 'on-hold', color: 'text-orange-400' },
  ];

  readonly priorityOptions: ProjectOption[] = [
    { label: 'High', value: 'high', color: 'text-red-400' },
    { label: 'Medium', value: 'medium', color: 'text-amber-400' },
    { label: 'Low', value: 'low', color: 'text-blue-400' },
  ];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Projects',
      pageDescription: 'Manage and track your project progress efficiently',
      pageIcon: 'pi pi-folder',
      isBreadcrumbShow: false,
    });

    this.initActionMenus();

    effect(() => {
      this.selectedStatus();
      this.selectedPriority();
      this.updateProjects();
    });
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.onManageProject(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.onDeleteProject(this.selectedRow),
      },
    ];
  }

  ngOnInit() {
    this.fetchProjects();
    this.fetchStaffMemberNames();
  }

  fetchStaffMemberNames() {
    this.#http
      .get<{ data: { staffMemberId: string; staffMemberFullName: string }[] }>(
        'data/staff-members-short.json',
      )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((res) => {
        this.#staffMemberNames.set(new Map(res.data.map((e) => [e.staffMemberId, e.staffMemberFullName])));
      });
  }

  memberName(staffMemberId: string): string {
    return this.#staffMemberNames().get(staffMemberId) ?? staffMemberId;
  }

  fetchProjects() {
    this.isLoading.set(true);
    this.#projectsApi
      .fetchProjects()
      .pipe(
        delay(500),
        finalize(() => this.isLoading.set(false)),
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
          this.updateProjects();
        },
      });
  }

  updateProjects() {
    let filteredProjects = this.#projectsApi.getProjects();

    if (this.selectedStatus()) {
      filteredProjects = filteredProjects.filter(
        (project) => project.status === this.selectedStatus(),
      );
    }

    if (this.selectedPriority()) {
      filteredProjects = filteredProjects.filter(
        (project) => project.priority === this.selectedPriority(),
      );
    }

    this.projects.set(filteredProjects);
  }

  getStatusLabel(status: string): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'secondary' {
    switch (status) {
      case 'active':
        return 'info';
      case 'completed':
        return 'success';
      case 'on-hold':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  getPriorityLabel(priority: string): string {
    return this.priorityOptions.find((option) => option.value === priority)?.label ?? priority;
  }

  getPrioritySeverity(priority: string): 'danger' | 'warn' | 'secondary' {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warn';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'var(--p-green-500)';
    if (progress >= 40) return 'var(--p-amber-500)';
    return 'var(--p-red-500)';
  }

  onStatusChange(status: SelectChangeEvent) {
    this.selectedStatus.set(status.value);
  }

  onPriorityChange(priority: SelectChangeEvent) {
    this.selectedPriority.set(priority.value);
  }

  onManageProject(project?: Project) {
    const ref = this.#dialogService.open(NewProjectDialog, {
      header: project ? 'Edit Project' : 'Add new Project',
      style: { width: '90vw', maxWidth: '45rem', padding: '0.2rem' },
      contentStyle: { overflow: 'hidden' },
      closable: true,
      modal: true,
      data: { project },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((response: Project) => {
      if (response) {
        if (project) {
          this.#projectsApi.updateProject(project.id, response);
        } else {
          this.#projectsApi.addProject(response);
        }
        this.updateProjects();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  onDeleteProject(project: Project) {
    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${project?.name}</strong> and all its contents. This action cannot be undone.`,
      header: 'Delete this project',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Project',
      rejectLabel: 'Keep Project',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#projectsApi.deleteProject(project.id);
        this.updateProjects();
      },
    });
  }

  searchProject(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }
}
