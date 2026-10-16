import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import {
  DialogService,
  DynamicDialogConfig,
  DynamicDialogRef,
} from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  BulkImportDialogData,
  IInstitutionPolicyFilter,
  SettledSearchTerm,
  INSTITUTION_POLICY_LIFECYCLE_OPERATION_NAME,
  InstitutionPolicyLifecycleAction,
  InstitutionPolicyListItem,
  InstitutionPolicyStatus,
} from '@shared/interfaces';

import { POLICY_DEFINITION_IMPORT_DISPLAY, policyBulkImportAdapter } from '../policy-bulk-import';
import {
  DEFINITIONS_MODULE_CODE,
  EDITABLE_STATUSES,
  hasStatus,
  LIFECYCLE_MODULE_CODE,
  policyCreateRoute,
  policyEditRoute,
  statusSeverity,
} from '../institution-policy-constants';
import { PolicyDefinitionsStore } from './policy-definitions.store';
import ResolvePoliciesDialog from './resolve-policies-dialog/resolve-policies-dialog';

/** Menu order, and the statuses each lifecycle action applies to. Each action gates on its leaf in
 *  `LIFECYCLE_MODULE_CODE`, which is not always this screen's own. */
const TRANSITION_MENU_ITEMS: {
  action: InstitutionPolicyLifecycleAction;
  label: string;
  icon: string;
  statuses: readonly InstitutionPolicyStatus[];
}[] = [
  { action: 'SUBMIT', label: 'Submit for review', icon: 'pi pi-send', statuses: EDITABLE_STATUSES },
  { action: 'APPROVE', label: 'Approve', icon: 'pi pi-check-circle', statuses: ['Under Review'] },
  { action: 'REJECT', label: 'Reject', icon: 'pi pi-times-circle', statuses: ['Under Review'] },
  { action: 'PUBLISH', label: 'Publish', icon: 'pi pi-megaphone', statuses: ['Approved'] },
  { action: 'ARCHIVE', label: 'Archive', icon: 'pi pi-box', statuses: ['Published'] },
];

function transitionConfirmCopy(policy: InstitutionPolicyListItem, action: InstitutionPolicyLifecycleAction) {
  const subject = `<strong>${policy.name}</strong> (v${policy.versionNumber})`;
  const copy: Record<
    InstitutionPolicyLifecycleAction,
    { header: string; message: string; acceptLabel: string }
  > = {
    SUBMIT: {
      header: 'Submit for review',
      message: `This sends ${subject} for approval. It can no longer be edited while under review.`,
      acceptLabel: 'Submit',
    },
    APPROVE: {
      header: 'Approve this policy',
      message: `This records your approval of ${subject}. It does not put the policy into effect - Publish is a separate step.`,
      acceptLabel: 'Approve',
    },
    REJECT: {
      header: 'Reject this policy',
      message: `This marks ${subject} as Rejected. A fresh submission from there starts a new approval count.`,
      acceptLabel: 'Reject',
    },
    PUBLISH: {
      header: 'Publish this policy',
      message: `This makes ${subject} the current, immutable version. Editing it further requires cloning a new version.`,
      acceptLabel: 'Publish',
    },
    ARCHIVE: {
      header: 'Archive this policy',
      message: `This retires ${subject} from active use.`,
      acceptLabel: 'Archive',
    },
  };
  return copy[action];
}

@Component({
  selector: 'app-policy-definitions',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    FormsModule,
    SelectModule,
    SplitButtonModule,
    TagModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [PolicyDefinitionsStore],
  templateUrl: './policy-definitions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyDefinitions {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(PolicyDefinitionsStore);

  protected readonly statusSeverity = statusSeverity;
  protected readonly table = viewChild<Table>('dt');
  protected readonly selectedRow = signal<InstitutionPolicyListItem | null>(null);

  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(DEFINITIONS_MODULE_CODE, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(DEFINITIONS_MODULE_CODE, 'Update'),
  );
  protected readonly canImport = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(DEFINITIONS_MODULE_CODE, 'Import'),
  );
  /** The loading and empty rows must span the same columns the header renders. The actions column
   *  is always one of them: "Manage version" is ungated — each tab gates on its own leaf. */
  protected readonly columnCount = 6;

  /** Import hangs off the Create split button, the same place the other masters put it. Resolve
   *  stays a button of its own: the split button is disabled without the Add grant, and a
   *  read-only session still has every right to ask which policies apply to someone. */
  protected readonly createMenuItems = computed<MenuItem[]>(() =>
    this.canImport()
      ? [
          {
            label: 'Import Policies',
            icon: 'pi pi-upload',
            command: () => this.openBulkImport(),
          },
        ]
      : [],
  );

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const policy = this.selectedRow();
    if (!policy) return [];

    const items: MenuItem[] = [
      {
        label: 'Manage version',
        icon: 'pi pi-book',
        command: () => this.openWorkspace(policy),
      },
    ];
    if (hasStatus(EDITABLE_STATUSES, policy.status) && this.canUpdate()) {
      items.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertPolicy(policy),
      });
    }

    const transitions = TRANSITION_MENU_ITEMS.filter(
      ({ action, statuses }) => hasStatus(statuses, policy.status) && this.#canTransition(action),
    ).map(({ action, label, icon }) => ({
      label,
      icon,
      command: () => this.confirmTransition(policy, action),
    }));

    return [...items, ...transitions];
  });

  constructor() {
    this.#setPageHeaderInfo();
  }

  #canTransition(action: InstitutionPolicyLifecycleAction): boolean {
    return this.#featurePageStore.canPerformOrUnknown(
      LIFECYCLE_MODULE_CODE[action],
      INSTITUTION_POLICY_LIFECYCLE_OPERATION_NAME[action],
    );
  }

  #setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(DEFINITIONS_MODULE_CODE) ?? 'Policies',
      pageDescription: 'Create policy drafts and move them through review to publish',
      pageIcon: 'pi pi-file-edit',
      isBreadcrumbShow: false,
    });
  }

  policyTypeName(policyTypeId: number): string {
    return this.store.policyTypes().find((t) => t.id === policyTypeId)?.name ?? '-';
  }

  onPolicyTypeChange(policyTypeId: number | null) {
    this.#applyFilters({ policyTypeId });
  }

  onStatusChange(statusId: number | null) {
    this.#applyFilters({ statusId });
  }

  onSearch(value: SettledSearchTerm) {
    this.#resetPaginator();
    this.store.setSearch(value);
  }

  #applyFilters(change: IInstitutionPolicyFilter) {
    this.#resetPaginator();
    this.store.loadPolicies(
      { first: 0, rows: this.store.pageSize() },
      { ...this.store.appliedFilters(), ...change },
    );
  }

  /** A filter change refetches page 1, so the paginator has to follow — it keeps its own `first`
   *  and would otherwise still highlight the page the user was on. */
  #resetPaginator() {
    const table = this.table();
    if (table) table.first = 0;
  }

  openWorkspace(policy: InstitutionPolicyListItem) {
    void this.#router.navigate([
      '/app/institution-policies',
      policy.id,
      'versions',
      policy.currentVersionId,
    ]);
  }

  openBulkImport() {
    // The dialog owns the flow; Policies owns its target and its copy.
    const data: BulkImportDialogData = {
      adapter: policyBulkImportAdapter(
        this.#institutionPolicyApi,
        this.#featurePageStore,
        'definitions',
        DEFINITIONS_MODULE_CODE,
      ),
      display: POLICY_DEFINITION_IMPORT_DISPLAY,
    };

    const ref = this.#openDialog(BulkImportDialog, {
      header: 'Import Policies',
      style: { width: '90vw', maxWidth: '64rem' },
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) {
        this.#resetPaginator();
        this.store.reloadFirstPage();
      }
    });
  }

  /** Read-only: which published versions actually apply to one staffMember on one date. */
  openResolvePolicies() {
    this.#openDialog(ResolvePoliciesDialog, {
      header: 'Effective Policies',
      style: { width: '90vw', maxWidth: '56rem' },
      closeOnEscape: true,
      dismissableMask: true,
      focusOnShow: false,
    });
  }

  upsertPolicy(policy?: InstitutionPolicyListItem) {
    void this.#router.navigate(
      policy ? policyEditRoute(policy.id, policy.currentVersionId) : policyCreateRoute(),
    );
  }

  /** Every dialog here is modal, closes with the page, and keeps its content from scrolling it. */
  #openDialog<T>(component: Type<T>, config: DynamicDialogConfig): DynamicDialogRef | null {
    const ref = this.#dialogService.open(component, {
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      ...config,
    });
    this.#destroyRef.onDestroy(() => ref?.close());
    return ref;
  }

  confirmTransition(policy: InstitutionPolicyListItem, action: InstitutionPolicyLifecycleAction) {
    const { header, message, acceptLabel } = transitionConfirmCopy(policy, action);

    this.#confirmationService.confirm({
      header,
      message,
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel,
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: action === 'REJECT' ? 'p-button-danger' : 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.transitionPolicy(policy.currentVersionId, action),
    });
  }
}

