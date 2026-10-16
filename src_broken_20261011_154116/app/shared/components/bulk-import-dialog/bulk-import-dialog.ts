import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import {
  DialogService,
  DynamicDialogConfig,
  DynamicDialogRef,
} from '@openng/optimus-ui/dynamicdialog';
import { FileSelectEvent } from '@openng/optimus-ui/fileupload';
import { MessageModule } from '@openng/optimus-ui/message';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import {
  BulkImportDialogData,
  BulkImportFieldConfig,
  BulkImportFixDialogData,
  BulkImportFixResult,
  BulkImportRow,
} from '@shared/interfaces';
import { erroringColumns } from '@shared/utilities/bulk-import-errors';

import { BulkImportFixDialog } from '../bulk-import-fix-dialog/bulk-import-fix-dialog';
import { FileDropZone } from '../file-drop-zone/file-drop-zone';
import { BulkImportStore } from './bulk-import-dialog.store';

/**
 * How many rows either table renders. A draft may carry up to 5,000, and a dialog that lays every
 * one of them out is a scroller nobody reads to the end of - the report holds the full list.
 */
const MAX_TABLE_ROWS = 50;

/** The wizard's rail. Sublabels say what the step is for, so the numbers are not carrying it alone. */
const STEPS = [
  { label: 'Upload', hint: 'Select your file' },
  { label: 'Validate', hint: 'Check for errors' },
  { label: 'Confirm', hint: 'Review and import' },
  { label: 'Complete', hint: 'Import summary' },
] as const;

/**
 * Bulk import for any master that speaks the `bulk/preview` → `bulk/confirm` → `bulk/jobs/{id}`
 * endpoints. The importing feature supplies its own API calls and copy through
 * `DialogService.open(BulkImportDialog, { data })`, so nothing here knows which master it is
 * importing. See `BulkImportDialogData`.
 */
@Component({
  selector: 'app-bulk-import-dialog',
  imports: [
    ButtonModule,
    FileDropZone,
    MessageModule,
    ProgressBarModule,
    TabsModule,
    TextareaModule,
    TooltipModule,
  ],
  providers: [BulkImportStore],
  templateUrl: './bulk-import-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkImportDialog {
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  protected readonly store = inject(BulkImportStore);

  protected readonly display: BulkImportDialogData['display'] =
    inject(DynamicDialogConfig).data.display;

  protected readonly steps = STEPS;
  protected readonly maxTableRows = MAX_TABLE_ROWS;

  /** Whether the draft on screen came from a file. Both sources are held across tab switches, so
   * the chosen file existing is not what makes it the one that was sent. */
  protected readonly isFileSource = computed(() => this.store.importSource() === 'file');

  /** What the draft was built from, named on the steps that no longer show the upload controls. */
  protected readonly sourceName = computed(() =>
    this.isFileSource() ? (this.store.file()?.name ?? 'No file chosen') : 'Pasted CSV data',
  );

  /** Only a file has a size to report; pasted rows are counted but not measured. */
  protected readonly sourceSize = computed(() => {
    const size = this.isFileSource() ? this.store.file()?.size : undefined;

    return size === undefined ? '' : this.#formatBytes(size);
  });

  /** The columns the tables are keyed by, read the same way the cells are so the two cannot differ. */
  protected readonly sourceColumns = computed(() => {
    const draft = this.store.preview();
    if (!draft) return [];

    return draft.sourceColumns.length
      ? draft.sourceColumns
      : Object.keys(draft.rows[0]?.values ?? {});
  });

  /**
   * Which rail markers carry a tick. The last one tracks the job rather than the wizard: `step()`
   * stops at 4, so on the step's own condition Complete would sit unticked on a finished import.
   */
  protected readonly doneSteps = computed(() => {
    const reached = this.store.step() - 1;

    return STEPS.map(
      (_, index) => index < reached || (index === STEPS.length - 1 && this.store.isComplete()),
    );
  });

  /** Invalid rows first: those are the ones the step exists for. */
  protected readonly validateRows = computed(() => {
    const rows = this.store.preview()?.rows ?? [];

    return [...rows]
      .sort((a, b) => Number(b.errors.length > 0) - Number(a.errors.length > 0))
      .slice(0, MAX_TABLE_ROWS);
  });

  /**
   * Whether the validate table carries an Actions column. Fix is the only action there, so with
   * nothing to fix the column is a header over a run of empty cells.
   */
  protected readonly hasRowActions = computed(() =>
    this.validateRows().some((row) => row.errors.length > 0),
  );

  /** Held here so the expanded detail row spans whatever the header above it actually rendered. */
  protected readonly validateColumnCount = computed(() => (this.hasRowActions() ? 5 : 4));

  protected readonly confirmRows = computed(() => this.store.readyRows().slice(0, MAX_TABLE_ROWS));

  /** Rows the tables leave out, so a truncated list never reads as the whole file. */
  protected readonly hiddenValidateRows = computed(() =>
    Math.max(this.store.totalRows() - MAX_TABLE_ROWS, 0),
  );

  protected readonly hiddenConfirmRows = computed(() =>
    Math.max(this.store.readyRows().length - MAX_TABLE_ROWS, 0),
  );

  protected onSelect(event: FileSelectEvent): void {
    const file = event.currentFiles[0];
    if (!file) return;

    this.store.acceptFile(file);
  }

  /** A drop skips the picker's `accept`, so the store checks the count and extension itself. */
  protected onDrop(files: FileList): void {
    this.store.acceptDroppedFiles(files);
  }

  protected removeFile(): void {
    this.store.removeFile();
  }

  protected startAnother(): void {
    this.store.startAnother();
  }

  /** Upload runs the check that opens Validate; Validate hands the same draft on to Confirm. */
  protected next(): void {
    if (this.store.step() === 1) {
      this.store.previewImport();
      return;
    }

    this.store.goToConfirm();
  }

  /**
   * Validate back to Upload with the source intact: pasted rows are corrected in the box they were
   * pasted into, and emptying it would cost the user everything the draft was built from.
   */
  protected changeSource(): void {
    this.store.backToUpload();
  }

  /** Closes with `true` once a job ran, so the caller knows its list is stale. */
  protected close(): void {
    this.#dialogRef.close(this.store.hasImported());
  }

  /**
   * Expanded rows on Validate, by row number. Collapsed by default: the table is the overview, and
   * a new draft starts collapsed rather than reopening whatever row the last one had open.
   */
  protected readonly expandedRows = linkedSignal<unknown, ReadonlySet<number>>({
    source: () => this.store.preview(),
    computation: () => new Set(),
  });

  protected isExpanded(rowNumber: number): boolean {
    return this.expandedRows().has(rowNumber);
  }

  protected toggleRow(rowNumber: number): void {
    this.expandedRows.update((expanded) => {
      const next = new Set(expanded);
      if (!next.delete(rowNumber)) next.add(rowNumber);

      return next;
    });
  }

  /** Named on the button, so it says how much work opening it is rather than just "Fix". */
  protected readonly fixableLabel = computed(() => {
    const count = this.store.invalidRows().length;

    return count === 1 ? 'View & fix 1 invalid row' : `View & fix ${count} invalid rows`;
  });

  /**
   * Opens the corrections editor over the wizard.
   *
   * `autoZIndex` is off by default in Optimus, so a child opened from inside a dialog would sit
   * under the one that opened it. Every invalid row goes across, not the fifty the table renders —
   * the cap is a reading limit, and the rows past it need fixing just as much.
   */
  protected openFix(startRowNumber?: number): void {
    const draft = this.store.preview();
    if (!draft || this.store.isBusy() || !this.store.invalidRows().length) return;

    // PrimeNG restores focus on close, but the fork is unverified on a nested dialog and a button
    // that loses focus leaves the keyboard at the top of the page.
    const trigger = document.activeElement as HTMLElement | null;

    const data: BulkImportFixDialogData = {
      rows: this.store.invalidRows(),
      sourceColumns: this.sourceColumns(),
      columnMapping: draft.columnMapping ?? {},
      fields: this.#fixFields(),
      display: this.display,
      startRowNumber,
    };

    const ref = this.#dialogService.open(BulkImportFixDialog, {
      header: 'Fix import errors',
      style: { width: '95vw', maxWidth: '72rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      autoZIndex: true,
      baseZIndex: 11000,
      data,
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((edits?: BulkImportFixResult) => {
        trigger?.focus();
        if (edits?.size) this.store.applyRowFixes(edits);
      });
  }

  /**
   * The editor's field list. A master that describes none still gets an editor — every column as a
   * text input, which is exactly what the wizard already shows, only writable.
   */
  #fixFields(): readonly BulkImportFieldConfig[] {
    const columns = new Set(this.sourceColumns());
    // The described order is the one the sections were written in; the sheet's column order is not
    // it, and following that would scatter a section across the pane.
    const described = (this.display.fields ?? []).filter((field) => columns.has(field.column));
    const describedColumns = new Set(described.map((field) => field.column));

    const rest = this.sourceColumns()
      .filter((column) => !describedColumns.has(column))
      .map((column) => ({ column, label: column, type: 'text' as const }));

    return [...described, ...rest];
  }

  /** A valid row has no count to give, but its cells are still worth opening. */
  protected errorCountLabel(row: BulkImportRow): string {
    if (row.errors.length === 0) return 'Details';

    return row.errors.length === 1 ? '1 error' : `${row.errors.length} errors`;
  }

  protected rowSummary(row: BulkImportRow): string {
    return row.values[this.display.rowSummaryField] || `Row ${row.rowNumber}`;
  }

  /**
   * The row's cells in source-column order, so a value sitting in the wrong column is visible.
   * Blank cells stay in the list: a shifted column only reads as shifted next to the empty one it
   * left behind.
   *
   * `hasError` marks the columns the row's own errors name, so the offending value is visible
   * beside the sentence complaining about it rather than left to be matched up by eye.
   */
  protected rowCells(row: BulkImportRow): { column: string; value: string; hasError: boolean }[] {
    const columns = this.sourceColumns().length ? this.sourceColumns() : Object.keys(row.values);
    const faulty = erroringColumns(row.errors, columns, this.store.preview()?.columnMapping ?? {});

    return columns.map((column) => ({
      column,
      value: row.values[column]?.trim() || '—',
      hasError: faulty.has(column),
    }));
  }

  /** Decimal units, matching the 5 MB cap the dialog states and the store enforces. */
  #formatBytes(bytes: number): string {
    if (bytes < 1000) return `${bytes} B`;
    if (bytes < 1000 * 1000) return `${Math.round(bytes / 1000)} KB`;

    return `${(bytes / (1000 * 1000)).toFixed(1)} MB`;
  }
}
