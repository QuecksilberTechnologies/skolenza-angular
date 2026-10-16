import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import {
  BulkImportAdapter,
  BulkImportDialogData,
  BulkImportDisplayConfig,
  BulkImportJobStatus,
} from '@shared/interfaces';

import { BULK_IMPORT_JOBS_PAGE_SIZES, BulkImportJobsStore } from './bulk-import-jobs.store';

/** Label and tone per lifecycle status, exhaustive by construction. */
const STATUS_LABELS: Record<BulkImportJobStatus, string> = {
  [BulkImportJobStatus.Draft]: 'Draft',
  [BulkImportJobStatus.Queued]: 'Queued',
  [BulkImportJobStatus.Running]: 'Running',
  [BulkImportJobStatus.Completed]: 'Completed',
  [BulkImportJobStatus.CompletedWithErrors]: 'Completed with errors',
  [BulkImportJobStatus.Failed]: 'Failed',
  [BulkImportJobStatus.Cancelled]: 'Cancelled',
};

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const STATUS_SEVERITIES: Record<BulkImportJobStatus, TagSeverity> = {
  [BulkImportJobStatus.Draft]: 'secondary',
  [BulkImportJobStatus.Queued]: 'info',
  [BulkImportJobStatus.Running]: 'info',
  [BulkImportJobStatus.Completed]: 'success',
  [BulkImportJobStatus.CompletedWithErrors]: 'warn',
  [BulkImportJobStatus.Failed]: 'danger',
  [BulkImportJobStatus.Cancelled]: 'secondary',
};

/**
 * The import history for one master: every job this user has run, with the report, retry and
 * cancel actions the wizard itself does not offer.
 *
 * Master-agnostic on purpose. The five Bulk Upload menu entries are five thin route components
 * that differ only in the adapter, the copy and the module code they gate on, so the table, the
 * polling-free refresh and the wizard hand-off live here once.
 */
@Component({
  selector: 'app-bulk-import-jobs',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    TableModule,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TagModule,
    TooltipModule,
  ],
  providers: [BulkImportJobsStore],
  templateUrl: './bulk-import-jobs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkImportJobs implements OnInit {
  readonly adapter = input.required<BulkImportAdapter>();
  readonly display = input.required<BulkImportDisplayConfig>();
  /** The existing functional leaf that publishes `Import` and `View`, e.g. `INSTITUTION_DEPARTMENTS`. */
  readonly moduleCode = input.required<string>();
  /** Title case, used in the dialog header and the toolbar button: "Departments". */
  readonly entityTitle = input.required<string>();
  readonly emptyIcon = input('pi pi-upload');

  readonly store = inject(BulkImportJobsStore);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly pageSizes = BULK_IMPORT_JOBS_PAGE_SIZES;

  /** Import is the operation the menu leaf publishes for the write; the table itself is `View`. */
  protected readonly canImport = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode(), 'Import'),
  );

  ngOnInit(): void {
    this.store.setContext(this.adapter(), this.display());
  }

  protected statusLabel(status: BulkImportJobStatus): string {
    return STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusSeverity(status: BulkImportJobStatus): TagSeverity {
    return STATUS_SEVERITIES[status] ?? 'secondary';
  }

  protected openBulkImport(): void {
    const data: BulkImportDialogData = { adapter: this.adapter(), display: this.display() };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: `Import ${this.entityTitle()}`,
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the newest job is on page 1.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadFirstPage();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
