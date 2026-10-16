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
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { catchError, map, of } from 'rxjs';

import { Common, CampusApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { StaffMemberDeviceEnrollmentRow, SettledSearchTerm } from '@shared/interfaces';
import { injectStaffMemberFilterOptions } from '@shared/utilities/staffMember-filter-options';

import {
  AVAILABLE_CARDS,
  StaffMemberDeviceCardBind,
} from './staffMember-device-card-bind/staffMember-device-card-bind';
import { StaffMemberDeviceEnrollmentForm } from './staffMember-device-enrollment-form/staffMember-device-enrollment-form';
import { StaffMemberDeviceEnrollmentsStore } from './staffMember-device-enrollment-info.store';
import { StaffMemberDeviceFaceUpload } from './staffMember-device-face-upload/staffMember-device-face-upload';
import { StaffMemberDevicePin } from './staffMember-device-pin/staffMember-device-pin';

/** One page big enough to hold every location — this feeds a dropdown, not a grid. */
const LOCATION_LOOKUP_PAGE_SIZE = 500;

@Component({
  selector: 'app-staffMember-device-enrollment-info',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [StaffMemberDeviceEnrollmentsStore],
  templateUrl: './staffMember-device-enrollment-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberDeviceEnrollmentInfo implements OnInit {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #campusApi = inject(CampusApi);

  readonly store = inject(StaffMemberDeviceEnrollmentsStore);

  protected readonly staffMemberFilter = injectStaffMemberFilterOptions();

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#campusApi.getCampuses({ PageSize: LOCATION_LOOKUP_PAGE_SIZE }).pipe(
        map((res) =>
          (res.isSucceeded ? (res.data ?? []) : []).map((location) => ({
            id: location.id as number | null,
            locationName: location.locationName,
          })),
        ),
        catchError(() => of([])),
      ),
  });

  /** `null` is the "All" row, the same clear affordance the status filter uses. */
  protected readonly locationOptions = computed(() => [
    { id: null as number | null, locationName: 'All Locations' },
    ...(this.#locationsResource.value() ?? []),
  ]);
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());

  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /**
   * This page's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. The
   * page publishes only View / Assign / Remove, so enrolling, editing, the status toggle and binding
   * a card all gate on `Assign` and only the delete and unbind gate on `Remove` - the same split
   * the request pipeline uses in `core/interceptors/module-operation-routes.ts`.
   */
  protected readonly moduleCode = 'STAFF_DEVICE_ENROLMENTS';
  protected readonly canAssign = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Assign'),
  );
  protected readonly canRemove = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Remove'),
  );

  /**
   * No institution-scoped lookup of bindable cards is published yet, so there is nothing for the picker
   * to offer - see `docs/api-coverage/api-issues-for-backend.md`, Issue 13. The action hides until
   * that endpoint lands rather than opening a dialog that cannot submit.
   */
  protected readonly canBindCard = computed(() => this.canAssign() && AVAILABLE_CARDS.length > 0);
  /** Unbinding needs no lookup, only the credential type the ddl names. */
  protected readonly canUnbindCard = computed(
    () => this.canRemove() && this.store.cardCredentialType() !== null,
  );

  protected readonly canUseRowActions = computed(() => this.canAssign() || this.canRemove());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 8 : 7));

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() ||
      !!this.store.staffMemberId() ||
      this.store.campusId() !== null ||
      this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<StaffMemberDeviceEnrollmentRow | null>(null);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canAssign = this.canAssign();
    const canRemove = this.canRemove();
    const isCardBound = !!row?.cardCommandStatus;

    return [
      ...(canAssign
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.openEnrollmentForm(row),
            },
            {
              label: row?.isActive ? 'Deactivate' : 'Activate',
              icon: row?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              command: () => row && this.confirmToggleActive(row),
            },
          ]
        : []),
      ...(this.canBindCard()
        ? [{ label: 'Bind Card', icon: 'pi pi-id-card', command: () => row && this.bindCard(row) }]
        : []),
      ...(canAssign
        ? [
            {
              label: 'Upload Face',
              icon: 'pi pi-camera',
              command: () => row && this.uploadFace(row),
            },
            { label: 'Set PIN', icon: 'pi pi-key', command: () => row && this.setPin(row) },
          ]
        : []),
      ...(this.canUnbindCard() && isCardBound
        ? [
            {
              label: 'Unbind Card',
              icon: 'pi pi-times',
              command: () => row && this.unbindCard(row),
            },
          ]
        : []),
      ...(canAssign && canRemove ? [{ separator: true }] : []),
      ...(canRemove
        ? [
            {
              label: 'Delete',
              icon: 'pi pi-trash text-red-500! dark:text-red-400!',
              styleClass: 'text-red-500! dark:text-red-400! dark:hover:bg-zinc-700 font-medium',
              command: () => row && this.removeEnrollment(row),
            },
          ]
        : []),
    ];
  });

  ngOnInit() {
    this.#commonService.setPageHeaderInfo({
      pageTitle:
        this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Device Enrollments',
      pageDescription: 'StaffMembers enrolled on attendance devices.',
      pageIcon: 'pi pi-mobile',
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

  searchEnrollments(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  loadEnrollments(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  openEnrollmentForm(enrollment?: StaffMemberDeviceEnrollmentRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberDeviceEnrollmentForm, {
      header: enrollment ? 'Edit Device Enrollment' : 'Add Device Enrollment',
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { enrollment, staffMemberId: this.store.staffMemberId() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved) => {
      if (saved) {
        this.store.reloadEnrollments();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  bindCard(enrollment: StaffMemberDeviceEnrollmentRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberDeviceCardBind, {
      header: 'Bind Card',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { enrollment },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((bound) => {
      if (bound) {
        this.store.reloadEnrollments();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  uploadFace(enrollment: StaffMemberDeviceEnrollmentRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberDeviceFaceUpload, {
      header: 'Upload Face',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { enrollment },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((queued) => {
      if (queued) {
        this.store.reloadEnrollments();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  setPin(enrollment: StaffMemberDeviceEnrollmentRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberDevicePin, {
      header: 'Set PIN',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { enrollment },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((queued) => {
      if (queued) {
        this.store.reloadEnrollments();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(enrollment: StaffMemberDeviceEnrollmentRow) {
    const action = enrollment.isActive ? 'deactivate' : 'activate';
    this.#confirmationService.confirm({
      message: `Are you sure you want to ${action} the enrollment on <strong>${enrollment.deviceName ?? 'this device'}</strong>?`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle text-amber-500! text-2xl!',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(enrollment),
    });
  }

  unbindCard(enrollment: StaffMemberDeviceEnrollmentRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to unbind the card from the enrollment on <strong>${enrollment.deviceName ?? 'this device'}</strong>? The card returns to the host as available.`,
      header: 'Unbind Card',
      icon: 'pi pi-exclamation-circle text-amber-500! text-2xl!',
      acceptLabel: 'Unbind Card',
      rejectLabel: 'Keep Card',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.unbindCard(enrollment),
    });
  }

  removeEnrollment(enrollment: StaffMemberDeviceEnrollmentRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete the enrollment on <strong>${enrollment.deviceName ?? 'this device'}</strong>? The staffMember will no longer be recognised by it.`,
      header: 'Delete Device Enrollment',
      icon: 'pi pi-trash text-red-400! text-xl!',
      acceptLabel: 'Delete Enrollment',
      rejectLabel: 'Keep Enrollment',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteEnrollment(enrollment),
    });
  }
}

