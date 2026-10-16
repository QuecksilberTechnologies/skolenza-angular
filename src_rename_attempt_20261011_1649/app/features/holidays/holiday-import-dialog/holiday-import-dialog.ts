import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { FileSelectEvent } from '@openng/optimus-ui/fileupload';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { catchError, finalize, map, of } from 'rxjs';

import { Common, HolidayCalandarApi, CampusApi } from '@core/services';
import { FileDropZone } from '@shared/components/file-drop-zone/file-drop-zone';
import { CampusRow } from '@shared/interfaces';
import { downloadBlob } from '@shared/utilities/download-blob';

type ImportSource = 'file' | 'paste';

const CSV_HEADER = 'CampusId,HolidayName,HolidayDate,IsOptional,Description,Icon';

/** One page big enough to hold every location — this feeds a dropdown, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

/**
 * Header plus one sample row. `/Holiday` has no template endpoint, so this is the template too; it
 * carries the chosen location's id so nobody has to look it up.
 */
function sampleCsv(locationId: number | null): string {
  return `${CSV_HEADER}\n${locationId ?? 1},Republic Day,2026-01-26,false,National holiday,`;
}

const TEMPLATE_FILE_NAME = 'Holiday-template.csv';
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];

export interface ImportRowErrorGroup {
  /** Compact row label, e.g. `Rows 2–15, 18` */
  readonly rows: string;
  readonly reason: string;
}

export interface ImportErrors {
  readonly summary: string;
  readonly groups: readonly ImportRowErrorGroup[];
}

const ROW_SPLIT = /\s*\bRow (\d+):\s*/;

/** `[2,3,4,7]` → `2–4, 7` */
function formatRowRanges(rows: readonly number[]): string {
  const sorted = [...rows].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start}` : `${start}–${sorted[i]}`);
  }
  return parts.join(', ');
}

/**
 * The import endpoint flattens every row failure into one sentence (`… Row 2: reason. Row 3:
 * reason.`). Split it back out and merge rows that share a reason, so 100 identical failures read
 * as one line instead of a wall of text.
 */
export function parseImportErrors(message: string): ImportErrors {
  const [lead, ...rest] = (message ?? '').split(ROW_SPLIT);
  const byReason = new Map<string, number[]>();
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const reason = rest[i + 1].trim().replace(/\.+$/, '');
    const rows = byReason.get(reason) ?? [];
    rows.push(Number(rest[i]));
    byReason.set(reason, rows);
  }
  const groups = [...byReason].map(([reason, rows]) => ({
    rows: `${rows.length > 1 ? 'Rows' : 'Row'} ${formatRowRanges(rows)}`,
    reason: `${reason}.`,
  }));
  return { summary: lead.trim() || 'Holiday import failed.', groups };
}

/**
 * `HolidayCalandarApi.importHolidays` is a single `POST /import` call, not the
 * `bulk/preview` → `bulk/confirm` → `bulk/jobs/{id}` draft/job flow the other masters use (see
 * `shared/interfaces/holiday.ts`), so this dialog is its own thing rather than `BulkImportDialog`
 * with an adapter. Swagger publishes no response schema past the envelope, so there is no per-row
 * result to show - only the message the backend returns.
 */
@Component({
  selector: 'app-holiday-import-dialog',
  imports: [
    ButtonModule,
    FileDropZone,
    FormsModule,
    MessageModule,
    SelectModule,
    TabsModule,
    TextareaModule,
    TooltipModule,
  ],
  templateUrl: './holiday-import-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayImportDialog {
  readonly #holidayCalandarApi = inject(HolidayCalandarApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #campusApi = inject(CampusApi);

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#campusApi
        .getCampuses({ IsActive: true, PageSize: LOOKUP_PAGE_SIZE })
        .pipe(
          map((res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
            }
            return res.isSucceeded ? (res.data ?? []) : [];
          }),
          catchError((err) => {
            this.#commonService.showMessage(err.message, 'error');
            return of([] as CampusRow[]);
          }),
        ),
  });

  protected readonly locations = computed(() => this.#locationsResource.value() ?? []);
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());
  /** Only shapes the template and the paste example - the API reads the location from each row. */
  protected readonly locationId = signal<number | null>(null);
  protected readonly pastePlaceholder = computed(() => sampleCsv(this.locationId()));
  protected readonly acceptedExtensions = ACCEPTED_EXTENSIONS.join(',');
  protected readonly source = signal<ImportSource>('file');
  protected readonly file = signal<File | null>(null);
  protected readonly pastedText = signal('');
  protected readonly isImporting = signal(false);
  protected readonly importErrors = signal<ImportErrors | null>(null);

  protected readonly canImport = computed(() =>
    this.source() === 'file' ? !!this.file() : this.pastedText().trim().length > 0,
  );

  protected onSourceChange(value: string | number | undefined): void {
    if (value !== 'file' && value !== 'paste') return;
    this.source.set(value);
    this.importErrors.set(null);
  }

  protected onSelect(event: FileSelectEvent): void {
    this.file.set(event.currentFiles[0] ?? null);
    this.importErrors.set(null);
  }

  protected downloadTemplate(): void {
    const csv = `${sampleCsv(this.locationId())}\n`;
    downloadBlob(new Blob([csv], { type: 'text/csv' }), TEMPLATE_FILE_NAME);
  }

  /** A drop skips the picker's `accept`, so the count and extension are checked here. */
  protected onDrop(files: FileList): void {
    const file = files[0];
    if (!file) return;

    if (files.length > 1) {
      this.#rejectDrop('Drop one file at a time. An import reads a single file.');
    } else if (!ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      this.#rejectDrop(`${file.name} is not a CSV or XLSX file. Choose one of those.`);
    } else {
      this.file.set(file);
      this.importErrors.set(null);
    }
  }

  #rejectDrop(summary: string): void {
    this.file.set(null);
    this.importErrors.set({ summary, groups: [] });
  }

  protected removeFile(): void {
    this.file.set(null);
    this.importErrors.set(null);
  }

  protected onPastedTextChange(value: string): void {
    this.pastedText.set(value);
    this.importErrors.set(null);
  }

  protected onImport(): void {
    if (this.isImporting() || !this.canImport()) {
      return;
    }

    const body = new FormData();
    if (this.source() === 'file') {
      body.append('File', this.file()!);
    } else {
      body.append('PastedText', this.pastedText());
    }

    this.isImporting.set(true);
    this.importErrors.set(null);

    this.#holidayCalandarApi
      .importHolidays(body)
      .pipe(
        finalize(() => this.isImporting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'success');
            this.#dialogRef.close(true);
          } else {
            this.#showErrors(res.message);
          }
        },
        error: (err) => this.#showErrors(err.message),
      });
  }

  /** Toast carries only the summary; per-row detail renders in the dialog's scrollable panel. */
  #showErrors(message: string): void {
    const errors = parseImportErrors(message);
    this.importErrors.set(errors);
    this.#commonService.showMessage(errors.summary, 'error');
  }

  protected onCancel(): void {
    this.#dialogRef.close();
  }
}
