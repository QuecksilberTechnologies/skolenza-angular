import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TableModule } from '@openng/optimus-ui/table';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore, LookupStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import {
  BulkImportDialogData,
  InstitutionPolicyAcknowledgement,
  InstitutionPolicyAssignment,
  InstitutionPolicyAuditEntry,
  InstitutionPolicyDocument,
  InstitutionPolicyException,
} from '@shared/interfaces';
import { injectStaffMemberOptions } from '@shared/utilities/staffMember-filter-options';
import {
  institutionPolicyAuditActorName,
  institutionPolicyAuditVersion,
} from '@shared/utilities/institution-policy-audit';

import { POLICY_ASSIGNMENT_IMPORT_DISPLAY, policyBulkImportAdapter } from '../policy-bulk-import';
import {
  ASSIGNMENTS_MODULE_CODE,
  DEFINITIONS_MODULE_CODE,
  statusSeverity,
} from '../institution-policy-constants';
import AssignPolicyDialog from './assign-policy-dialog/assign-policy-dialog';
import CloneVersionDialog from './clone-version-dialog/clone-version-dialog';
import PolicyDocumentDialog from './policy-document-dialog/policy-document-dialog';
import PolicyExceptionDialog from './policy-exception-dialog/policy-exception-dialog';
import {
  ACKNOWLEDGEMENTS_MODULE_CODE,
  EXCEPTIONS_MODULE_CODE,
  PolicyVersionTab,
  PolicyVersionWorkspaceStore,
} from './policy-version-workspace.store';

const TABS: { value: PolicyVersionTab; label: string; icon: string }[] = [
  { value: 'documents', label: 'Documents', icon: 'pi pi-file' },
  { value: 'assignments', label: 'Assignments', icon: 'pi pi-users' },
  { value: 'exceptions', label: 'Exceptions', icon: 'pi pi-flag' },
  { value: 'acknowledgements', label: 'Acknowledgements', icon: 'pi pi-check-square' },
  { value: 'approvals', label: 'Approval progress', icon: 'pi pi-sitemap' },
  { value: 'audit', label: 'Audit', icon: 'pi pi-history' },
];

@Component({
  selector: 'app-policy-version-workspace',
  imports: [
    DatePipe,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MessageModule,
    SkeletonModule,
    TableModule,
    TabsModule,
    TagModule,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
  ],
  providers: [PolicyVersionWorkspaceStore],
  templateUrl: './policy-version-workspace.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyVersionWorkspace {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #dialogService = inject(DialogService);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #lookupStore = inject(LookupStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(PolicyVersionWorkspaceStore);

  /** Every evidence tab keys on `staffMemberId`; the lookup is what turns those ids into names. */
  readonly #staffMembers = injectStaffMemberOptions();
  readonly #staffMemberNames = computed(
    () => new Map(this.#staffMembers.options().map((option) => [option.staffMemberId, option.fullName])),
  );

  protected readonly tabs = TABS;
  protected readonly statusSeverity = statusSeverity;

  protected readonly policyTypeName = computed(() => {
    const policyTypeId = this.store.detail()?.policyTypeId;
    return this.store.policyTypes().find((type) => type.id === policyTypeId)?.name ?? null;
  });

  protected readonly ownerDepartmentName = computed(() => {
    const ownerDepartmentId = this.store.detail()?.ownerDepartmentId;
    if (!ownerDepartmentId) return null;
    return (
      this.#lookupStore.departmentOptions().find((d) => d.id === ownerDepartmentId)
        ?.departmentName ?? null
    );
  });

  /** Protects the workspace if a stale route or response ever returns a different version. */
  protected readonly isViewingCurrentVersion = computed(() => {
    const detail = this.store.detail();
    return detail === null ? true : detail.versionId === this.store.versionId();
  });

  /** The status of the version the route names, or `null` while it is unknown — either the detail
   *  has not landed or it describes a different version, and guessing would gate the wrong one. */
  protected readonly versionStatus = computed(() =>
    this.isViewingCurrentVersion() ? (this.store.detail()?.status ?? null) : null,
  );

  /** Documents are frozen when review starts so approval always covers the exact same content. */
  protected readonly isDocumentMutable = computed(() => {
    const status = this.versionStatus();
    return status === 'Draft' || status === 'Rejected';
  });

  /** Mirror of the same rule for assignments: only a published version can be assigned. */
  protected readonly isAssignable = computed(() => this.versionStatus() === 'Published');

  /** The two reasons the status is unknown read the same to the user and disable the same actions,
   *  but neither is the version being locked - the captions must not claim that it is. */
  protected readonly isVersionStatusKnown = computed(
    () => this.versionStatus() !== null || this.store.isLoadingDetail(),
  );

  protected readonly canUploadDocument = computed(
    () =>
      this.#featurePageStore.canPerformOrUnknown(DEFINITIONS_MODULE_CODE, 'Upload') &&
      this.isDocumentMutable(),
  );
  protected readonly canDeleteDocument = computed(
    () =>
      this.#featurePageStore.canPerformOrUnknown(DEFINITIONS_MODULE_CODE, 'Delete') &&
      this.isDocumentMutable(),
  );
  protected readonly canClone = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(DEFINITIONS_MODULE_CODE, 'Add'),
  );
  protected readonly canAssign = computed(
    () =>
      this.#featurePageStore.canPerformOrUnknown(ASSIGNMENTS_MODULE_CODE, 'Assign') &&
      this.isAssignable(),
  );
  /** Not gated on this version's status, unlike `canAssign`: the import file names its own policy
   *  and version per row, so its rows may target published versions other than this one. */
  protected readonly canImportAssignments = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(ASSIGNMENTS_MODULE_CODE, 'Import'),
  );
  protected readonly canRemoveAssignment = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(ASSIGNMENTS_MODULE_CODE, 'Remove'),
  );
  protected readonly canAddException = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(EXCEPTIONS_MODULE_CODE, 'Add'),
  );
  protected readonly canApproveException = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(EXCEPTIONS_MODULE_CODE, 'Approve'),
  );
  protected readonly canRejectException = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(EXCEPTIONS_MODULE_CODE, 'Reject'),
  );
  protected readonly canAcknowledge = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(ACKNOWLEDGEMENTS_MODULE_CODE, 'Acknowledge'),
  );

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Policy Version',
      pageDescription: 'Policy Version',
      pageIcon: 'pi pi-book',
      isBreadcrumbShow: true,
    });

    // Same idiom as Role Permissions: a nested screen names its parent in the breadcrumb rather
    // than repeating the title inside the card.
    effect(() => {
      const detail = this.store.detail();
      const trail = this.store.isLoadingDetail()
        ? 'Loading...'
        : detail
          ? `${detail.name} - v${detail.versionNumber}`
          : 'Policy version';

      this.#commonService.setBreadcrumbItems([
        { label: 'Policies', routerLink: '/app/institution-policies' },
        { label: trail },
      ]);
    });

    // A clone navigates to the new version on this same route, so the params are read as a stream
    // rather than once from the snapshot.
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const policyId = Number(params.get('policyId'));
      const versionId = Number(params.get('versionId'));

      if (!Number.isFinite(policyId) || !Number.isFinite(versionId)) {
        this.#commonService.showMessage('That policy version could not be opened.', 'error');
        void this.#router.navigate(['/app/institution-policies']);
        return;
      }

      this.store.setContext(policyId, versionId);
    });
  }

  /** `StaffMember/get-all` reports ids as strings, the policy API as numbers. Falls back to the id so
   *  a row whose staffMember the lookup does not carry still identifies itself. */
  protected staffMemberName(staffMemberId: number): string {
    return this.#staffMemberNames().get(String(staffMemberId)) ?? `StaffMember ${staffMemberId}`;
  }

  protected readonly auditActorName = institutionPolicyAuditActorName;

  readonly #currentVersion = computed(() => {
    const detail = this.store.detail();
    return detail ? { id: detail.versionId, number: detail.versionNumber } : null;
  });

  protected auditVersion(entry: InstitutionPolicyAuditEntry) {
    return institutionPolicyAuditVersion(entry, this.#currentVersion());
  }

  protected onTabChange(value: unknown) {
    this.store.setActiveTab(value as PolicyVersionTab);
  }

  /** Assigned, then viewed, then acknowledged — derived from the timestamps rather than the
   *  numeric `status`, whose code list the API does not document. */
  protected acknowledgementState(row: InstitutionPolicyAcknowledgement): {
    label: string;
    severity: 'success' | 'info' | 'secondary';
  } {
    if (row.acknowledgedDateTime) return { label: 'Acknowledged', severity: 'success' };
    if (row.viewedDateTime) return { label: 'Viewed', severity: 'info' };
    return { label: 'Assigned', severity: 'secondary' };
  }

  // --- Documents ---------------------------------------------------------------------------------

  protected uploadDocument() {
    const versionId = this.store.versionId();
    if (versionId === null) return;

    const ref: DynamicDialogRef | null = this.#dialogService.open(PolicyDocumentDialog, {
      header: 'Upload Document',
      style: { width: '95vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { versionId, documentTypes: this.store.documentTypes() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) this.store.reloadDocuments();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /** The API re-issues a temporary object URL on every read, so the link is followed now rather
   *  than stored anywhere. */
  protected openDocument(document: InstitutionPolicyDocument) {
    if (typeof window === 'undefined' || !document.url) return;
    window.open(document.url, '_blank', 'noopener');
  }

  protected confirmDeleteDocument(document: InstitutionPolicyDocument) {
    this.#confirmationService.confirm({
      header: 'Delete this document',
      message: `This removes <strong>${document.title}</strong> from the version and deletes the stored file.`,
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteDocument(document.id),
    });
  }

  // --- Assignments -------------------------------------------------------------------------------

  protected assignPolicy() {
    const versionId = this.store.versionId();
    if (versionId === null) return;

    const ref: DynamicDialogRef | null = this.#dialogService.open(AssignPolicyDialog, {
      header: 'Assign Policy',
      style: { width: '95vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { versionId },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) this.store.reloadAssignments();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /** The import file names its own policy and version per row, so it is not scoped to the version
   *  in the address bar - the list is reloaded either way, since rows for it may have landed. */
  protected openAssignmentImport() {
    const data: BulkImportDialogData = {
      adapter: policyBulkImportAdapter(
        this.#institutionPolicyApi,
        this.#featurePageStore,
        'assignments',
        ASSIGNMENTS_MODULE_CODE,
      ),
      display: POLICY_ASSIGNMENT_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Policy Assignments',
      style: { width: '90vw', maxWidth: '64rem' },
      modal: true,
      closable: true,
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadAssignments();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  protected confirmRemoveAssignment(assignment: InstitutionPolicyAssignment) {
    this.#confirmationService.confirm({
      header: 'Remove this assignment',
      message: `This deactivates the assignment for <strong>${this.staffMemberName(assignment.staffMemberId)}</strong>. Its history is kept.`,
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.removeAssignment(assignment.id),
    });
  }

  // --- Exceptions --------------------------------------------------------------------------------

  protected addException() {
    const versionId = this.store.versionId();
    if (versionId === null) return;

    const ref: DynamicDialogRef | null = this.#dialogService.open(PolicyExceptionDialog, {
      header: 'Submit Exception',
      style: { width: '95vw', maxWidth: '44rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { versionId },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) this.store.reloadExceptions();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  protected confirmDecision(exception: InstitutionPolicyException, approve: boolean) {
    this.#confirmationService.confirm({
      header: approve ? 'Approve this exception' : 'Reject this exception',
      message: approve
        ? `This grants <strong>${this.staffMemberName(exception.staffMemberId)}</strong> the override for its effective period.`
        : `This rejects the override requested for <strong>${this.staffMemberName(exception.staffMemberId)}</strong>.`,
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: approve ? 'Approve' : 'Reject',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: approve ? 'p-button-primary' : 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.decideException(exception.id, approve),
    });
  }

  // --- Acknowledgement and cloning ---------------------------------------------------------------

  protected confirmAcknowledge() {
    const detail = this.store.detail();

    this.#confirmationService.confirm({
      header: 'Acknowledge this policy',
      message: `This records <strong>your own</strong> acknowledgement of ${detail?.name ?? 'this policy'} (v${detail?.versionNumber ?? ''}).`,
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Acknowledge',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.acknowledge(),
    });
  }

  protected cloneVersion() {
    const policyId = this.store.policyId();
    const versionId = this.store.versionId();
    if (policyId === null || versionId === null) return;

    const ref: DynamicDialogRef | null = this.#dialogService.open(CloneVersionDialog, {
      header: 'Clone Version',
      style: { width: '95vw', maxWidth: '36rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { policyId, versionId },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (typeof result === 'number') {
        void this.#router.navigate(['/app/institution-policies', policyId, 'versions', result]);
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
