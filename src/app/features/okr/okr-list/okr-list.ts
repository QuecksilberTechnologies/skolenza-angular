import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select } from '@openng/optimus-ui/select';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  IOkr,
  IOkrFilter,
  OkrLevel,
  OkrScope,
  OkrStatus,
  SettledSearchTerm,
} from '@shared/interfaces';

import { OkrStore } from '../okr.store';
import { OkrLevelBadge } from '../ui/okr-level-badge';
import { OkrProgress } from '../ui/okr-progress';
import { OkrStatusTag } from '../ui/okr-status-tag';

interface ScopeMeta {
  title: string;
  description: string;
  icon: string;
}

const SCOPE_META: Record<OkrScope, ScopeMeta> = {
  my: { title: 'My OKRs', description: 'Objectives you own and drive', icon: 'pi pi-user' },
  team: { title: 'Team OKRs', description: 'Objectives across your team', icon: 'pi pi-users' },
  company: {
    title: 'Company OKRs',
    description: 'Organization-wide objectives',
    icon: 'pi pi-building',
  },
};

@Component({
  selector: 'app-okr-list',
  imports: [
    DatePipe,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    MenuModule,
    ConfirmDialogModule,
    Select,
    TooltipModule,
    TableInlineFilters,
    TableSearchInput,
    TableLoader,
    TableEmptyMessage,
    OkrLevelBadge,
    OkrProgress,
    OkrStatusTag,
  ],
  providers: [OkrStore],
  templateUrl: './okr-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OkrList implements OnInit {
  readonly store = inject(OkrStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #commonService = inject(Common);
  readonly #authStore = inject(AuthStore);

  readonly table = viewChild<Table>('dt');
  readonly selectedOkrs = signal<IOkr[]>([]);

  protected selectedRow!: IOkr;
  protected actionMenuItems: MenuItem[] = [];

  /** Admin (1) or Manager (3) may mutate; StaffMember (2) is read-only. */
  protected readonly canManage = computed(() => {
    const role = this.#authStore.roleTypeId();
    return role === 1 || role === 3;
  });

  readonly levelOptions: { label: string; value: OkrLevel }[] = [
    { label: 'Company', value: 'Company' },
    { label: 'Department', value: 'Department' },
    { label: 'Team', value: 'Team' },
    { label: 'Personal', value: 'Personal' },
  ];

  readonly statusOptions: { label: string; value: OkrStatus }[] = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Active', value: 'Active' },
    { label: 'On Track', value: 'OnTrack' },
    { label: 'Behind', value: 'Behind' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Archived', value: 'Archived' },
  ];

  readonly quarterOptions = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'].map((q) => ({
    label: q,
    value: q,
  }));

  readonly departmentOptions = [
    { label: 'Engineering', value: 'dep-eng' },
    { label: 'Sales', value: 'dep-sales' },
    { label: 'Marketing', value: 'dep-mkt' },
    { label: 'Human Resources', value: 'dep-hr' },
    { label: 'Product', value: 'dep-prod' },
    { label: 'Finance', value: 'dep-fin' },
  ];

  constructor() {
    this.initActionMenu();
  }

  ngOnInit(): void {
    const scope = (this.#route.snapshot.data['scope'] as OkrScope) ?? 'my';
    this.store.setScope(scope);

    const meta = SCOPE_META[scope];
    this.#commonService.setPageHeaderInfo({
      pageTitle: meta.title,
      pageDescription: meta.description,
      pageIcon: meta.icon,
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'OKRs', routerLink: '/app/okr/dashboard' },
      { label: meta.title },
    ]);
  }

  initActionMenu(): void {
    this.actionMenuItems = [
      { label: 'View details', icon: 'pi pi-eye', command: () => this.view(this.selectedRow) },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        visible: false,
        command: () => this.edit(this.selectedRow),
      },
      {
        label: 'Duplicate',
        icon: 'pi pi-copy',
        visible: false,
        command: () => this.store.duplicateOkr(this.selectedRow),
      },
      {
        label: 'Archive',
        icon: 'pi pi-inbox',
        visible: false,
        command: () => this.confirmArchive([this.selectedRow.id]),
      },
      { separator: true, visible: false },
      {
        label: 'Delete',
        icon: 'pi pi-trash !text-red-500',
        styleClass: '!text-red-500 font-medium',
        visible: false,
        command: () => this.confirmDelete(this.selectedRow),
      },
    ];
  }

  openRowMenu(okr: IOkr): void {
    this.selectedRow = okr;
    const manage = this.canManage();
    // index 1=Edit, 2=Duplicate, 3=Archive, 4=separator, 5=Delete
    [1, 2, 3, 4, 5].forEach((i) => (this.actionMenuItems[i].visible = manage));
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.store.loadOkrs(event);
  }

  onSearch(term: SettledSearchTerm): void {
    this.store.setSearchTerm(term);
  }

  onFilterChange(patch: Partial<IOkrFilter>): void {
    this.store.updateAppliedFilters({ ...this.store.appliedFilters(), ...patch });
  }

  view(okr: IOkr): void {
    this.#router.navigate(['/app/okr', okr.id], { queryParams: { from: this.store.scope() } });
  }

  edit(okr: IOkr): void {
    this.#router.navigate(['/app/okr', okr.id, 'edit'], {
      queryParams: { from: this.store.scope() },
    });
  }

  create(): void {
    this.#router.navigate(['/app/okr/create'], { queryParams: { from: this.store.scope() } });
  }

  exportCsv(): void {
    this.table()?.exportCSV();
  }

  confirmDelete(okr: IOkr): void {
    this.#confirmationService.confirm({
      message: `This will permanently delete <strong>${okr.title}</strong>. This action cannot be undone.`,
      header: 'Delete OKR',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Keep',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteOkr(okr),
    });
  }

  confirmArchive(ids: string[]): void {
    this.#confirmationService.confirm({
      message: `Archive ${ids.length} OKR${ids.length > 1 ? 's' : ''}? They can be restored later.`,
      header: 'Archive OKRs',
      icon: 'pi pi-inbox !text-amber-500 !text-xl',
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-warn',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.archiveOkrs(ids);
        this.selectedOkrs.set([]);
      },
    });
  }

  confirmArchiveSelected(): void {
    const ids = this.selectedOkrs().map((o) => o.id);
    if (ids.length) this.confirmArchive(ids);
  }

  confirmBulkDelete(): void {
    const ids = this.selectedOkrs().map((o) => o.id);
    if (!ids.length) return;
    this.#confirmationService.confirm({
      message: `Permanently delete ${ids.length} selected OKR${ids.length > 1 ? 's' : ''}? This cannot be undone.`,
      header: 'Delete selected OKRs',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.bulkDelete(ids);
        this.selectedOkrs.set([]);
      },
    });
  }
}
