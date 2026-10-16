import { DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { catchError, map, of } from 'rxjs';

import { Common, CampusApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { StaffMemberLocationAssignmentRow } from '@shared/interfaces';
import { injectStaffMemberOptions } from '@shared/utilities/staffMember-filter-options';

import { StaffMemberLocationAssignmentForm } from './staffMember-location-assignment-form/staffMember-location-assignment-form';
import { StaffMemberLocationAssignmentsStore } from './staffMember-location-assignment-info.store';

/** One page big enough to hold every lookup row — these feed dropdowns, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

@Component({
  selector: 'app-staffMember-location-assignment-info',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    DatePipe,
    FormsModule,
    SelectModule,
    TableModule,
    TagModule,
    TieredMenu,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
  ],
  providers: [StaffMemberLocationAssignmentsStore],
  templateUrl: './staffMember-location-assignment-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberLocationAssignmentInfo implements OnInit {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #campusApi = inject(CampusApi);

  readonly store = inject(StaffMemberLocationAssignmentsStore);

  protected readonly staffMemberFilter = injectStaffMemberOptions();

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#campusApi.getCampuses({ PageSize: LOOKUP_PAGE_SIZE }).pipe(
        map((res) =>
          (res.isSucceeded ? (res.data ?? []) : []).map((location) => ({
            id: location.id as number | null,
            locationName: location.locationName,
          })),
        ),
        catchError(() => of([])),
      ),
  });

  protected readonly locationOptions = computed(() => this.#locationsResource.value() ?? []);
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());

  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /** This page's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. */
  protected readonly moduleCode = 'STAFF_CAMPUS_ASSIGNMENTS';
  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 8 : 7));

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.staffMemberId() ||
      this.store.campusId() !== null ||
      this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<StaffMemberLocationAssignmentRow | null>(null);

  /** Local `yyyy-MM-dd`, the same shape the API sends, so dates compare as plain strings. */
  readonly #today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');

  /** `isActive` is a manual flag; an assignment whose window has closed is not really in force. */
  protected isExpired(assignment: StaffMemberLocationAssignmentRow): boolean {
    return (
      assignment.isActive &&
      !!assignment.effectiveTo &&
      assignment.effectiveTo.slice(0, 10) < this.#today
    );
  }

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();

    return [
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.openAssignmentForm(row),
            },
            {
              label: row?.isActive ? 'Deactivate' : 'Activate',
              icon: row?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              command: () => row && this.confirmToggleActive(row),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: 'Delete',
              icon: 'pi pi-trash text-red-600! dark:text-red-400!',
              styleClass: 'text-red-600! dark:text-red-400! dark:hover:bg-zinc-700 font-medium',
              command: () => row && this.removeAssignment(row),
            },
          ]
        : []),
    ];
  });

  ngOnInit() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Work Locations',
      pageDescription: 'Locations each staffMember may mark attendance from.',
      pageIcon: 'pi pi-map',
      isBreadcrumbShow: false,
    });
    // A link from elsewhere can pre-select the staffMember.
    this.store.setStaffMemberId(this.#route.snapshot.queryParamMap.get('staffMemberId') ?? '');
  }

  onStaffMemberChange(staffMemberId: string | null) {
    this.store.setStaffMemberId(staffMemberId ?? '');
  }

  onLocationChange(campusId: number | null) {
    this.store.setCampusId(campusId);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive);
  }

  loadAssignments(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  openAssignmentForm(assignment?: StaffMemberLocationAssignmentRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberLocationAssignmentForm, {
      header: assignment ? 'Edit Location Assignment' : 'Add Location Assignment',
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { assignment, staffMemberId: this.store.staffMemberId() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved) => {
      if (saved) {
        this.store.reloadAssignments();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(assignment: StaffMemberLocationAssignmentRow) {
    const action = assignment.isActive ? 'deactivate' : 'activate';
    this.#confirmationService.confirm({
      message: `Are you sure you want to ${action} the assignment to <strong>${assignment.campusName ?? 'this location'}</strong>?`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle text-amber-700! dark:text-amber-400! text-2xl!',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(assignment),
    });
  }

  removeAssignment(assignment: StaffMemberLocationAssignmentRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete the assignment to <strong>${assignment.campusName ?? 'this location'}</strong>? This action cannot be undone.`,
      header: 'Delete Location Assignment',
      icon: 'pi pi-trash text-red-600! dark:text-red-400! text-xl!',
      acceptLabel: 'Delete Assignment',
      rejectLabel: 'Keep Assignment',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteAssignment(assignment),
    });
  }
}

