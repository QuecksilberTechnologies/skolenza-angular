import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DialogService,
  DynamicDialogConfig,
  DynamicDialogRef,
} from '@openng/optimus-ui/dynamicdialog';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import {
  BulkImportDialogData,
  BulkImportFixDialogData,
  BulkImportFixResult,
  BulkImportJob,
  BulkImportJobRequest,
  BulkImportJobResponse,
  BulkImportJobStatus,
  BulkImportPreviewResponse,
  BulkImportRowStatus,
} from '@shared/interfaces';

import { BulkImportDialog } from './bulk-import-dialog';

const previewResponse: BulkImportPreviewResponse = {
  isSucceeded: true,
  message: 'Preview is ready',
  errors: [],
  data: {
    jobId: 'job-1',
    master: 3,
    sourceColumns: ['WidgetName', 'WidgetType'],
    columnMapping: { WidgetName: 'WidgetName', WidgetType: 'WidgetType' },
    errors: [],
    rows: [
      {
        processed: false,
        rowNumber: 2,
        values: { WidgetName: 'Manager', WidgetType: '3' },
        status: BulkImportRowStatus.Ready,
        existingId: null,
        errors: [],
      },
    ],
    readyCount: 1,
    existingCount: 0,
    invalidCount: 0,
    isValid: true,
    confirmationAvailable: true,
    canCommit: true,
  },
};

const invalidPreviewResponse: BulkImportPreviewResponse = {
  ...previewResponse,
  data: {
    ...previewResponse.data,
    rows: [
      ...previewResponse.data.rows,
      {
        processed: false,
        rowNumber: 3,
        values: { WidgetName: '', WidgetType: '9' },
        status: BulkImportRowStatus.Invalid,
        existingId: null,
        errors: ['WidgetName is required'],
      },
    ],
    invalidCount: 1,
    isValid: false,
    canCommit: false,
  },
};

const jobResponse: BulkImportJobResponse = {
  isSucceeded: true,
  message: 'Import queued',
  errors: [],
  data: {
    jobId: 'job-1',
    master: 3,
    status: BulkImportJobStatus.Completed,
    createdAtUtc: '2026-09-10T18:04:43.676985Z',
    updatedAtUtc: '2026-09-10T18:04:48.30119Z',
    scheduledAtUtc: null,
    totalRows: 2,
    processedRows: 2,
    createdCount: 1,
    existingCount: 1,
    failedCount: 0,
    error: null,
    preview: null,
  },
};

/** A master that exists nowhere in the app: nothing here may depend on which one it is. */
const display: BulkImportDialogData['display'] = {
  entityLabelSingular: 'widget',
  entityLabelPlural: 'widgets',
  columnHints: ['WidgetName: required', 'WidgetType: required'],
  pastePlaceholder: 'WidgetName,WidgetType\nSupport Lead,3',
  templateFileName: 'Widget-template.csv',
  reportFileNamePrefix: 'Widget-import',
  rowSummaryField: 'WidgetName',
};

describe('BulkImportDialog', () => {
  let component: BulkImportDialog;
  let fixture: ComponentFixture<BulkImportDialog>;
  const downloadTemplate = vi.fn(() => of(new Blob(['WidgetName,WidgetType'])));
  const downloadReport = vi.fn((_: string) => of(new Blob(['RowNumber,Status'])));
  const preview = vi.fn<(body: FormData) => Observable<BulkImportPreviewResponse>>(() =>
    of(previewResponse),
  );
  const confirm = vi.fn<(body: BulkImportJobRequest) => Observable<BulkImportJobResponse>>(() =>
    of(jobResponse),
  );
  const adapter = {
    downloadTemplate,
    downloadReport,
    preview,
    confirm,
    getJob: vi.fn((_: string) => of(jobResponse)),
  };
  const common = { showMessage: vi.fn() };
  const dialogRef = { close: vi.fn() };
  /** The fix editor is opened through this; every case here closes it without corrections. */
  const fixClosed = new Subject<BulkImportFixResult | undefined>();
  const openFixDialog = vi.fn(
    (_component: unknown, _config: { data: BulkImportFixDialogData }) => ({
      onClose: fixClosed.asObservable(),
    }),
  );
  const dialogService = { open: openFixDialog };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkImportDialog],
      providers: [
        { provide: Common, useValue: common },
        { provide: DynamicDialogRef, useValue: dialogRef },
        { provide: DialogService, useValue: dialogService },
        { provide: DynamicDialogConfig, useValue: { data: { adapter, display } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkImportDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    vi.clearAllMocks();
  });

  /** Drives the dialog to a confirmed job, optionally overriding what the worker reports back. */
  function runImport(job: Partial<BulkImportJob> = {}): void {
    confirm.mockReturnValueOnce(of({ ...jobResponse, data: { ...jobResponse.data, ...job } }));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();
  }

  it('starts on the file tab', () => {
    expect(component['store'].importSource()).toBe('file');
  });

  it('opens on the Upload step', () => {
    expect(component['store'].step()).toBe(1);
  });

  it('moves to Validate once a draft comes back', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].step()).toBe(2);
  });

  it('stays on Upload when the check is rejected, next to the source it rejects', () => {
    preview.mockReturnValueOnce(of({ ...previewResponse, isSucceeded: false, message: 'No' }));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].step()).toBe(1);
  });

  describe('correcting rows in place', () => {
    /** Drives the dialog to a Validate step holding one valid row and one invalid one. */
    function reachInvalidDraft(): void {
      preview.mockReturnValueOnce(of(invalidPreviewResponse));
      component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
      component['store'].previewImport();
    }

    /** The FormData body of the nth preview call, one-based. */
    function previewBody(call: number): FormData {
      return preview.mock.calls[call - 1][0];
    }

    /**
     * A corrected sheet is a `File`, and reading one suspends before the request goes out — unlike
     * the pasted text every other case here drives the wizard with.
     */
    async function correct(fixes: BulkImportFixResult): Promise<void> {
      component['openFix']();
      fixClosed.next(fixes);
      await TestBed.inject(ApplicationRef).whenStable();
    }

    it('offers no correction when every row passed', () => {
      component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
      component['store'].previewImport();
      component['openFix']();

      expect(openFixDialog).not.toHaveBeenCalled();
    });

    it('names the number of rows the editor has to work through', () => {
      reachInvalidDraft();

      expect(component['fixableLabel']()).toBe('View & fix 1 invalid row');
    });

    it('hands the editor every invalid row, not the ones the table has space for', () => {
      const rows = Array.from({ length: 60 }, (_, index) => ({
        ...invalidPreviewResponse.data.rows[1],
        rowNumber: index + 2,
      }));
      preview.mockReturnValueOnce(
        of({
          ...invalidPreviewResponse,
          data: { ...invalidPreviewResponse.data, rows, invalidCount: rows.length },
        }),
      );
      component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
      component['store'].previewImport();
      component['openFix']();

      expect(openFixDialog.mock.calls[0][1].data.rows).toHaveLength(60);
    });

    it('describes every source column, so a master naming none still gets an editor', () => {
      reachInvalidDraft();
      component['openFix']();

      expect(openFixDialog.mock.calls[0][1].data.fields).toEqual([
        { column: 'WidgetName', label: 'WidgetName', type: 'text' },
        { column: 'WidgetType', label: 'WidgetType', type: 'text' },
      ]);
    });

    it('re-checks nothing when the editor is closed without corrections', async () => {
      reachInvalidDraft();
      component['openFix']();
      fixClosed.next(undefined);
      fixClosed.next(new Map());
      await TestBed.inject(ApplicationRef).whenStable();

      expect(preview).toHaveBeenCalledTimes(1);
    });

    it('sends the whole corrected sheet as a file, not the pasted rows it came from', async () => {
      reachInvalidDraft();
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      expect(preview).toHaveBeenCalledTimes(2);
      const body = previewBody(2);
      expect(body.get('PastedText')).toBeNull();
      expect(body.get('File')).toBeInstanceOf(File);
    });

    it('writes every row in source-column order, with the correction applied', async () => {
      reachInvalidDraft();
      await correct(new Map([[3, { WidgetName: 'Support, Lead' }]]));

      const file = previewBody(2).get('File') as File;

      expect(await file.text()).toBe('WidgetName,WidgetType\r\nManager,3\r\n"Support, Lead",9');
    });

    it('takes a RequestId of its own: the saved draft is not this sheet any more', async () => {
      reachInvalidDraft();
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      expect(previewBody(2).get('RequestId')).not.toBe(previewBody(1).get('RequestId'));
    });

    it('stays on Validate throughout, rather than dropping back to Upload', async () => {
      reachInvalidDraft();
      preview.mockReturnValueOnce(of(previewResponse));
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      expect(component['store'].step()).toBe(2);
      expect(component['store'].canConfirm()).toBe(true);
    });

    it('keeps the correction on screen when the re-check is rejected', async () => {
      reachInvalidDraft();
      preview.mockReturnValueOnce(throwError(() => new Error('Network is down')));
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      expect(component['store'].step()).toBe(2);
      expect(component['store'].preview()?.rows[1].values['WidgetName']).toBe('Support Lead');
    });

    it('keeps offering the editor while rows are still invalid', async () => {
      reachInvalidDraft();
      preview.mockReturnValueOnce(of(invalidPreviewResponse));
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      expect(component['store'].invalidRows()).toHaveLength(1);
    });

    it('keeps the pasted rows, which are the only copy of what the user typed', async () => {
      reachInvalidDraft();
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      expect(component['store'].pastedText()).toBe('WidgetName,WidgetType\nManager,3');
    });

    it('keeps the draft and the step when the re-check is turned away wholesale', async () => {
      reachInvalidDraft();
      preview.mockReturnValueOnce(
        of({ ...invalidPreviewResponse, isSucceeded: false, message: 'Unreadable sheet' }),
      );
      await correct(new Map([[3, { WidgetName: 'Support Lead' }]]));

      // Dropping to Upload here would take the draft and every correction with it.
      expect(component['store'].step()).toBe(2);
      expect(component['store'].preview()?.rows).toHaveLength(2);
    });

    it('still sends a first rejected check back to Upload, having no draft to keep', () => {
      preview.mockReturnValueOnce(of({ ...previewResponse, isSucceeded: false, message: 'No' }));
      component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
      component['store'].previewImport();

      expect(component['store'].step()).toBe(1);
      expect(component['store'].preview()).toBeNull();
    });

    it('will not start a correction while a check is already running', () => {
      reachInvalidDraft();
      preview.mockReturnValueOnce(NEVER);
      component['store'].previewImport();
      component['openFix']();

      expect(openFixDialog).not.toHaveBeenCalled();
    });
  });

  it('refuses to open Confirm while the draft carries invalid rows', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].goToConfirm();

    expect(component['store'].step()).toBe(2);
  });

  it('walks Validate to Confirm and back without re-checking the draft', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].goToConfirm();
    expect(component['store'].step()).toBe(3);

    component['store'].backToValidate();

    expect(component['store'].step()).toBe(2);
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it('lands on Complete once the job is accepted', () => {
    runImport({ status: BulkImportJobStatus.Queued, processedRows: 0 });

    expect(component['store'].step()).toBe(4);
  });

  it('keeps the pasted rows when Validate hands the user back to Upload', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['changeSource']();

    expect(component['store'].step()).toBe(1);
    expect(component['store'].pastedText()).toBe('WidgetName,WidgetType\nManager,3');
    expect(component['store'].preview()).not.toBeNull();
  });

  it('names the pasted source rather than a file left behind on the other tab', () => {
    component['onSelect']({ currentFiles: [new File(['WidgetName'], 'widgets.csv')] } as never);
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['sourceName']()).toBe('Pasted CSV data');
    expect(component['sourceSize']()).toBe('');
  });

  it('drops a draft whose source the user has already moved off', async () => {
    const pending = new Subject<BulkImportPreviewResponse>();
    preview.mockReturnValueOnce(pending);
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    component['store'].onImportSourceChange('file');
    pending.next(previewResponse);

    expect(component['store'].preview()).toBeNull();
    expect(component['store'].step()).toBe(1);
  });

  it('collapses the open rows when a new draft replaces the one they belong to', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['toggleRow'](3);

    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,4');
    component['store'].previewImport();

    expect(component['isExpanded'](3)).toBe(false);
  });

  it('returns to Upload when the source changes under a draft', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].goToConfirm();

    component['store'].onPastedTextChange('WidgetName,WidgetType\nLead,3');

    expect(component['store'].step()).toBe(1);
  });

  it('counts the rows the draft checked and the ones that passed', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].totalRows()).toBe(2);
    expect(component['store'].validRowCount()).toBe(1);
  });

  it('confirms the ready rows only, leaving the matches the worker will skip', () => {
    preview.mockReturnValueOnce(
      of({
        ...previewResponse,
        data: {
          ...previewResponse.data,
          rows: [
            ...previewResponse.data.rows,
            {
              processed: false,
              rowNumber: 3,
              values: { WidgetName: 'Support', WidgetType: '2' },
              status: BulkImportRowStatus.Existing,
              existingId: 12,
              errors: [],
            },
          ],
          existingCount: 1,
        },
      }),
    );
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].readyRows().map((row) => row.rowNumber)).toEqual([2]);
  });

  it('opens and closes the detail of one row at a time', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    component['toggleRow'](3);
    expect(component['isExpanded'](3)).toBe(true);
    expect(component['isExpanded'](2)).toBe(false);

    component['toggleRow'](3);
    expect(component['isExpanded'](3)).toBe(false);
  });

  it('names the error count on a row, and offers the cells of one without errors', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['errorCountLabel'](component['store'].invalidRows()[0]!)).toBe('1 error');
    expect(component['errorCountLabel'](component['store'].preview()!.rows[0]!)).toBe('Details');
  });

  it('leads the validate table with the rows needing attention', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    // Row 3 is the invalid one and arrives second in the payload.
    expect(component['validateRows']().map((row) => row.rowNumber)).toEqual([3, 2]);
  });

  it('keeps both sources when switching tabs and previews only the active one', async () => {
    const file = new File(['WidgetName,WidgetType\nManager,3'], 'widgets.csv');
    component['onSelect']({ currentFiles: [file] } as never);
    component['store'].onPastedTextChange('WidgetName,WidgetType\nLead,3');

    expect(component['store'].file()).toBe(file);
    expect(component['store'].pastedText()).toContain('Lead,3');

    component['store'].previewImport();

    const pastedPreview = preview.mock.calls[0]![0];
    expect(pastedPreview.get('PastedText')).toContain('Lead,3');
    expect(pastedPreview.has('File')).toBe(false);

    component['store'].onImportSourceChange('file');
    component['store'].previewImport();
    // The CSV row check reads the file first, so the request leaves on a later microtask.
    await new Promise((resolve) => setTimeout(resolve));

    const filePreview = preview.mock.calls[1]![0];
    expect(filePreview.get('File')).toBe(file);
    expect(filePreview.has('PastedText')).toBe(false);
  });

  it('clears a preview when switching import-source tabs', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    component['store'].onImportSourceChange('file');

    expect(component['store'].preview()).toBeNull();
    expect(component['store'].phase()).toBe('idle');
  });

  it('builds a preview from pasted CSV, leaving the permission ids to the interceptor', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    const formData = preview.mock.calls[0]![0];
    expect(formData.get('PastedText')).toBe('WidgetName,WidgetType\nManager,3');
    expect(formData.has('ModuleId')).toBe(false);
    expect(formData.has('OperationId')).toBe(false);
    expect(component['store'].preview()?.canCommit).toBe(true);
    expect(component['store'].phase()).toBe('ready');
  });

  it('rejects a header row with no data row without calling the API', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType,Remark,IsActive\n  \n');
    component['store'].previewImport();

    expect(preview).not.toHaveBeenCalled();
    expect(component['store'].message()).toBe(
      'Paste the header row and at least one data row below it.',
    );
  });

  it('names the configured entity when a chosen CSV carries only a header row', async () => {
    const template = new File(['WidgetName,WidgetType,Remark,IsActive\n'], 'Widget-template.csv');
    component['onSelect']({ currentFiles: [template] } as never);
    component['store'].previewImport();
    await new Promise((resolve) => setTimeout(resolve));

    expect(preview).not.toHaveBeenCalled();
    expect(component['store'].message()).toContain('only a header row');
    expect(component['store'].message()).toContain('one row per widget');
    expect(component['store'].messageSeverity()).toBe('error');
  });

  it('refuses a file over the 5 MB limit, workbook or not', () => {
    const huge = new File(['x'], 'widgets.xlsx');
    Object.defineProperty(huge, 'size', { value: 5 * 1024 * 1024 + 1 });
    component['onSelect']({ currentFiles: [huge] } as never);

    expect(component['store'].file()).toBeNull();
    expect(component['store'].message()).toContain('larger than the 5 MB limit');
  });

  it('refuses a drop of more than one file rather than importing the first', () => {
    const dropped = [new File(['a'], 'widgets-1.csv'), new File(['b'], 'widgets-2.csv')];
    component['onDrop'](dropped as unknown as FileList);

    expect(component['store'].file()).toBeNull();
    expect(component['store'].message()).toContain('Drop one file at a time');
  });

  it('refuses a file that is neither CSV nor XLSX', () => {
    component['onSelect']({ currentFiles: [new File(['x'], 'widgets.pdf')] } as never);

    expect(component['store'].file()).toBeNull();
    expect(component['store'].message()).toContain('is not a CSV or XLSX file');
  });

  it('refuses a paste over the 5,000 row limit', () => {
    const rows = Array.from({ length: 5001 }, (_, index) => `Widget ${index},2`).join('\n');
    component['store'].onPastedTextChange(`WidgetName,WidgetType\n${rows}`);
    component['store'].previewImport();

    expect(preview).not.toHaveBeenCalled();
    expect(component['store'].message()).toContain('over the 5000 row limit');
  });

  it('reads a newline inside a quoted cell as part of its row', () => {
    const quoted = 'WidgetName,WidgetType,Remark\nManager,3,"Runs a team\nday to day"';
    component['store'].onPastedTextChange(quoted);
    component['store'].previewImport();

    expect(preview).toHaveBeenCalled();
  });

  it('sends a workbook through unchecked, having no parser to read it with', async () => {
    const workbook = new File(['PK'], 'widgets.xlsx');
    component['onSelect']({ currentFiles: [workbook] } as never);
    component['store'].previewImport();
    await new Promise((resolve) => setTimeout(resolve));

    expect(preview).toHaveBeenCalled();
    expect(preview.mock.calls[0]![0].get('File')).toBe(workbook);
  });

  it('sends PastedText or File, never both', () => {
    component['onSelect']({ currentFiles: [new File(['WidgetName'], 'widgets.csv')] } as never);
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    const formData = preview.mock.calls[0]![0];
    expect(formData.has('File')).toBe(false);
    expect(formData.get('PastedText')).toBe('WidgetName,WidgetType\nManager,3');
  });

  it('keeps the chosen file when CSV data is pasted in the other tab', () => {
    component['onSelect']({ currentFiles: [new File(['WidgetName'], 'widgets.csv')] } as never);
    expect(component['store'].file()).not.toBeNull();

    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');

    expect(component['store'].file()).not.toBeNull();
    expect(component['store'].importSource()).toBe('paste');
  });

  it('says nothing about Confirm while the draft is confirmable', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].confirmBlockedReason()).toBe('');
  });

  it('names the invalid row count when Confirm is blocked', () => {
    preview.mockReturnValueOnce(
      of({
        ...invalidPreviewResponse,
        data: { ...invalidPreviewResponse.data, invalidCount: 5 },
      }),
    );
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].confirmBlockedReason()).toBe(
      'Fix the 5 invalid rows before importing. One invalid row blocks the whole file.',
    );
  });

  it('surfaces only the rows carrying errors', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].invalidRows().map((row) => row.rowNumber)).toEqual([3]);
  });

  it('titles an invalid row with the configured summary column', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    // The row's own WidgetName is blank, so the row number stands in for it.
    expect(component['rowSummary'](component['store'].invalidRows()[0]!)).toBe('Row 3');
    expect(component['rowSummary'](component['store'].preview()!.rows[0]!)).toBe('Manager');
  });

  it('lists a row cell per source column, in that order, so a shifted value shows up', () => {
    preview.mockReturnValueOnce(of(invalidPreviewResponse));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    const cells = component['rowCells'](component['store'].invalidRows()[0]!);

    expect(cells.map((cell) => cell.column)).toEqual(['WidgetName', 'WidgetType']);
    expect(cells.map((cell) => cell.value)).toEqual(['—', '9']);
  });

  it('marks the cell each error opens with, and leaves the ones it only mentions', () => {
    preview.mockReturnValueOnce(
      of({
        ...invalidPreviewResponse,
        data: {
          ...invalidPreviewResponse.data,
          rows: [
            {
              ...invalidPreviewResponse.data.rows[1]!,
              errors: ['WidgetName is required', 'Row 3 could not be read'],
            },
          ],
        },
      }),
    );
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    const cells = component['rowCells'](component['store'].invalidRows()[0]!);

    // `WidgetType` is named by no error, and `Row` is not a column at all.
    expect(cells.map((cell) => cell.hasError)).toEqual([true, false]);
  });

  it('marks a cell whose column the error names by its mapped field, quotes and spaces included', () => {
    preview.mockReturnValueOnce(
      of({
        ...invalidPreviewResponse,
        data: {
          ...invalidPreviewResponse.data,
          sourceColumns: ['Widget Name', 'Type'],
          columnMapping: { 'Widget Name': 'WidgetName', Type: 'WidgetType' },
          rows: [
            {
              ...invalidPreviewResponse.data.rows[1]!,
              values: { 'Widget Name': '', Type: '9' },
              errors: ["'Widget Name' is required", 'WidgetType must be one of 1, 2, 3.'],
            },
          ],
        },
      }),
    );
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    const cells = component['rowCells'](component['store'].invalidRows()[0]!);

    // The header carries a space and is quoted; `Type` is reached through its mapped name.
    expect(cells.map((cell) => cell.hasError)).toEqual([true, true]);
  });

  it('refuses confirmation when invalid rows accompany an inconsistent canCommit response', () => {
    preview.mockReturnValueOnce(
      of({
        ...invalidPreviewResponse,
        data: { ...invalidPreviewResponse.data, canCommit: true },
      }),
    );
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();

    expect(component['store'].canConfirm()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('confirms with the saved job id and keeps the dialog open on the queued job', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();

    expect(confirm).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component['store'].job()?.jobId).toBe('job-1');
  });

  it('returns to the draft when a confirm is rejected, so it can be sent again', () => {
    confirm.mockReturnValueOnce(of({ ...jobResponse, isSucceeded: false, message: 'Job expired' }));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();

    expect(component['store'].phase()).toBe('ready');
    expect(component['store'].message()).toBe('Job expired');
    expect(component['store'].job()).toBeNull();
  });

  it('closes with true once a job ran, so the caller refreshes the list', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();
    component['close']();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('empties the dialog for a second file once a job has run', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();
    component['startAnother']();

    expect(component['store'].job()).toBeNull();
    expect(component['store'].preview()).toBeNull();
    expect(component['store'].file()).toBeNull();
    expect(component['store'].pastedText()).toBe('');
    expect(component['store'].phase()).toBe('idle');
  });

  it('still reports the stale list after a reset, since the first import already ran', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();
    component['startAnother']();
    component['close']();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with false when nothing was imported', () => {
    component['close']();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('reads a clean run as a success headed by the created count', () => {
    runImport();

    expect(component['store'].phase()).toBe('result');
    expect(component['store'].isComplete()).toBe(true);
    expect(component['store'].jobTone()).toBe('success');
    expect(component['store'].jobHeadline()).toEqual({ value: 1, label: 'widget created' });
  });

  it('pluralises the headline from the configured labels', () => {
    runImport({ createdCount: 2 });

    expect(component['store'].jobHeadline()).toEqual({ value: 2, label: 'widgets created' });
  });

  it('warns and leads with the failures when the worker rejected rows', () => {
    runImport({ status: BulkImportJobStatus.CompletedWithErrors, failedCount: 2 });

    expect(component['store'].jobTone()).toBe('warning');
    expect(component['store'].jobHeadline()).toEqual({ value: 2, label: 'rows failed' });
  });

  it('warns on a cancelled job even though nothing failed', () => {
    runImport({ status: BulkImportJobStatus.Cancelled });

    expect(component['store'].jobTone()).toBe('warning');
  });

  it('reads a failed job as an error', () => {
    runImport({ status: BulkImportJobStatus.Failed, failedCount: 1 });

    expect(component['store'].jobTone()).toBe('error');
  });

  it('is not complete while the worker still holds the job', () => {
    runImport({ status: BulkImportJobStatus.Queued, processedRows: 0 });

    expect(component['store'].isComplete()).toBe(false);
    expect(component['store'].phase()).toBe('polling');
  });

  it('keeps polling a Draft, which has been accepted but not queued', () => {
    runImport({ status: BulkImportJobStatus.Draft, processedRows: 0 });

    expect(component['store'].isRunning()).toBe(true);
    expect(component['store'].isComplete()).toBe(false);
  });

  it('warns rather than ticks when the job stops answering', async () => {
    vi.useFakeTimers();
    adapter.getJob.mockReturnValue(throwError(() => new Error('offline')));
    runImport({ status: BulkImportJobStatus.Running, processedRows: 0 });

    // Five consecutive unreadable polls, each waiting longer than the last.
    await vi.advanceTimersByTimeAsync(3000 + 6000 + 12000 + 24000 + 24000);
    vi.useRealTimers();
    // `clearAllMocks` keeps implementations, so this one has to be put back by hand.
    adapter.getJob.mockReturnValue(of(jobResponse));

    expect(component['store'].phase()).toBe('error');
    expect(component['store'].isRunning()).toBe(false);
    expect(component['store'].isComplete()).toBe(false);
    // The last status read is stale, so the panel must not read as a clean run.
    expect(component['store'].jobTone()).toBe('warning');
    expect(component['store'].message()).toContain('Could not read the import status');
  });

  it('keeps the envelope errors when a preview is rejected', () => {
    preview.mockReturnValueOnce(
      of({
        ...previewResponse,
        isSucceeded: false,
        message: 'Provide a header row and at least one data row.',
        errors: ['Provide a header row and at least one data row.'],
      }),
    );
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(component['store'].preview()).toBeNull();
    expect(component['store'].phase()).toBe('idle');
    expect(component['store'].responseErrors()).toEqual([
      'Provide a header row and at least one data row.',
    ]);
  });

  it('starts one preview when Preview is double-clicked on a file', async () => {
    const file = new File(['WidgetName,WidgetType\nManager,3'], 'widgets.csv');
    component['onSelect']({ currentFiles: [file] } as never);

    // Reading the file suspends before the request goes out; the second click lands in that gap.
    component['store'].previewImport();
    component['store'].previewImport();
    await new Promise((resolve) => setTimeout(resolve));

    expect(preview).toHaveBeenCalledTimes(1);
  });

  it('leaves the dialog usable when the file fails a client check', async () => {
    // The phase is claimed before the file is read, so a rejection mid-read has to release it.
    const template = new File(['WidgetName,WidgetType\n'], 'Widget-template.csv');
    component['onSelect']({ currentFiles: [template] } as never);
    component['store'].previewImport();
    await new Promise((resolve) => setTimeout(resolve));

    expect(preview).not.toHaveBeenCalled();
    expect(component['store'].isBusy()).toBe(false);
    expect(component['store'].phase()).toBe('idle');
  });

  it('keeps the draft on screen when a re-preview fails to reach the server', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    expect(component['store'].phase()).toBe('ready');

    preview.mockReturnValueOnce(throwError(() => new Error('offline')));
    component['store'].previewImport();

    // The draft was never cleared, so the dialog goes back to it rather than a step behind it.
    expect(component['store'].phase()).toBe('ready');
    expect(component['store'].preview()).not.toBeNull();
    expect(component['store'].message()).toBe('offline');
  });

  it('reuses one RequestId across previews of the same source', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].previewImport();

    const first = preview.mock.calls[0]![0].get('RequestId');
    const second = preview.mock.calls[1]![0].get('RequestId');

    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it('takes a fresh RequestId once the source changes', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3\nAdmin,1');
    component['store'].previewImport();

    const first = preview.mock.calls[0]![0].get('RequestId');
    const second = preview.mock.calls[1]![0].get('RequestId');

    expect(second).not.toBe(first);
  });

  it('names the template download from the configuration', () => {
    component['store'].downloadTemplate();

    expect(downloadTemplate).toHaveBeenCalled();
  });

  it('names the report download after the job', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();
    component['store'].downloadReport();

    expect(downloadReport).toHaveBeenCalledWith('job-1');
  });

  it('names no sheet for a master whose workbook has only one', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(preview.mock.calls[0]![0].has('SheetName')).toBe(false);
  });

  it('offers no invitation send when the adapter cannot send one', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();

    expect(component['store'].isComplete()).toBe(true);
    expect(component['store'].canSendInvitations()).toBe(false);
  });
});

/**
 * The two things StaffMember import needs that no other master does. Its own module so the adapter and
 * display can differ from the shared harness above rather than weaken it.
 */
describe('BulkImportDialog with invitations and a named sheet', () => {
  let component: BulkImportDialog;
  let fixture: ComponentFixture<BulkImportDialog>;
  const preview = vi.fn<(body: FormData) => Observable<BulkImportPreviewResponse>>(() =>
    of(previewResponse),
  );
  const confirm = vi.fn<(body: BulkImportJobRequest) => Observable<BulkImportJobResponse>>(() =>
    of(jobResponse),
  );
  const sendInvitations =
    vi.fn<(body: BulkImportJobRequest) => Observable<BulkImportJobResponse>>();
  const adapter = {
    preview,
    confirm,
    sendInvitations,
    getJob: vi.fn((_: string) => of(jobResponse)),
    downloadTemplate: vi.fn(() => of(new Blob(['WidgetName']))),
    downloadReport: vi.fn((_: string) => of(new Blob(['RowNumber']))),
  };
  const common = { showMessage: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkImportDialog],
      providers: [
        { provide: Common, useValue: common },
        { provide: DynamicDialogRef, useValue: { close: vi.fn() } },
        { provide: DialogService, useValue: { open: vi.fn(() => ({ onClose: NEVER })) } },
        {
          provide: DynamicDialogConfig,
          useValue: { data: { adapter, display: { ...display, sheetName: 'Widgets' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkImportDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    vi.clearAllMocks();
    sendInvitations.mockReturnValue(of({ ...jobResponse, message: 'Invitations queued' }));
  });

  /** Drives the dialog to a confirmed job, optionally overriding what the worker reports back. */
  function runImport(job: Partial<BulkImportJob> = {}): void {
    confirm.mockReturnValueOnce(of({ ...jobResponse, data: { ...jobResponse.data, ...job } }));
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();
    component['store'].confirmImport();
  }

  it('names the sheet the API is to read', () => {
    component['store'].onPastedTextChange('WidgetName,WidgetType\nManager,3');
    component['store'].previewImport();

    expect(preview.mock.calls[0]![0].get('SheetName')).toBe('Widgets');
  });

  it('sends invitations for the finished job, with no row selection', () => {
    runImport();
    component['store'].sendInvitations();

    expect(sendInvitations).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(component['store'].message()).toBe('Invitations queued');
  });

  it('offers the send once, then not again', () => {
    runImport();
    expect(component['store'].canSendInvitations()).toBe(true);

    component['store'].sendInvitations();

    expect(component['store'].canSendInvitations()).toBe(false);
    component['store'].sendInvitations();
    expect(sendInvitations).toHaveBeenCalledTimes(1);
  });

  it('offers no send for a job that created nobody', () => {
    runImport({ createdCount: 0, existingCount: 2 });

    expect(component['store'].isComplete()).toBe(true);
    expect(component['store'].canSendInvitations()).toBe(false);
  });

  it('keeps the send available when the dispatch is rejected', () => {
    runImport();
    sendInvitations.mockReturnValueOnce(
      of({ ...jobResponse, isSucceeded: false, message: 'No seats left' }),
    );

    component['store'].sendInvitations();

    expect(component['store'].message()).toBe('No seats left');
    expect(component['store'].canSendInvitations()).toBe(true);
  });

  it('reports a failed dispatch without claiming the import failed', () => {
    runImport();
    sendInvitations.mockReturnValueOnce(throwError(() => new Error('Mail service unreachable')));

    component['store'].sendInvitations();

    expect(component['store'].message()).toBe('Mail service unreachable');
    expect(component['store'].messageSeverity()).toBe('error');
    expect(component['store'].isComplete()).toBe(true);
  });
});
