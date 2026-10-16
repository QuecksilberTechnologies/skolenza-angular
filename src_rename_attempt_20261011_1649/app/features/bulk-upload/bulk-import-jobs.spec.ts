import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { FeaturePageStore } from '@core/stores';
import {
  BulkImportAdapter,
  BulkImportDisplayConfig,
  BulkImportJobStatus,
} from '@shared/interfaces';

import { BulkImportJobs } from './bulk-import-jobs';
import { BulkImportJobsStore } from './bulk-import-jobs.store';

type Spy = ReturnType<typeof vi.fn>;

const display: BulkImportDisplayConfig = {
  entityLabelSingular: 'department',
  entityLabelPlural: 'departments',
  columnHints: [],
  pastePlaceholder: '',
  templateFileName: 'Department-template.csv',
  reportFileNamePrefix: 'Department-import',
  rowSummaryField: 'DepartmentName',
};

describe('BulkImportJobs', () => {
  let fixture: ComponentFixture<BulkImportJobs>;
  let component: BulkImportJobs;

  let adapter: BulkImportAdapter;
  let storeMock: Record<string, Spy>;
  let dialogServiceMock: { open: Spy };
  let featurePageStoreMock: { canPerformOrUnknown: Spy };
  let onClose$: Subject<boolean>;

  const build = async () => {
    fixture = TestBed.createComponent(BulkImportJobs);
    fixture.componentRef.setInput('adapter', adapter);
    fixture.componentRef.setInput('display', display);
    fixture.componentRef.setInput('moduleCode', 'INSTITUTION_DEPARTMENTS');
    fixture.componentRef.setInput('entityTitle', 'Departments');
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  beforeEach(() => {
    onClose$ = new Subject<boolean>();
    adapter = { preview: vi.fn() } as unknown as BulkImportAdapter;

    storeMock = {
      setContext: vi.fn(),
      loadJobs: vi.fn(),
      reloadFirstPage: vi.fn(),
      retryJob: vi.fn(),
      cancelJob: vi.fn(),
      downloadReport: vi.fn(),
      canRetry: vi.fn().mockReturnValue(false),
      canCancel: vi.fn().mockReturnValue(false),
      jobs: vi.fn().mockReturnValue([]),
      totalRecords: vi.fn().mockReturnValue(0),
      pageSize: vi.fn().mockReturnValue(10),
      isLoading: vi.fn().mockReturnValue(false),
      busyJobId: vi.fn().mockReturnValue(null),
      downloadingJobId: vi.fn().mockReturnValue(null),
    };

    dialogServiceMock = {
      open: vi.fn().mockReturnValue({ onClose: onClose$.asObservable(), close: vi.fn() }),
    };
    featurePageStoreMock = { canPerformOrUnknown: vi.fn().mockReturnValue(true) };

    TestBed.configureTestingModule({
      imports: [BulkImportJobs],
      providers: [
        { provide: DialogService, useValue: dialogServiceMock },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
      ],
    }).overrideComponent(BulkImportJobs, {
      set: { providers: [{ provide: BulkImportJobsStore, useValue: storeMock }] },
    });
  });

  it('hands the store its master before the first fetch', async () => {
    await build();

    expect(storeMock['setContext']).toHaveBeenCalledWith(adapter, display);
  });

  it('gates the import button on the leaf that publishes Import', async () => {
    await build();

    expect(featurePageStoreMock.canPerformOrUnknown).toHaveBeenCalledWith(
      'INSTITUTION_DEPARTMENTS',
      'Import',
    );
    expect(fixture.nativeElement.textContent).toContain('Import Departments');
  });

  it('hides the import button when the leaf does not publish Import', async () => {
    featurePageStoreMock.canPerformOrUnknown.mockReturnValue(false);
    await build();

    expect(fixture.nativeElement.textContent).not.toContain('Import Departments');
  });

  it('opens the wizard with the same adapter and copy the table uses', async () => {
    await build();

    component['openBulkImport']();

    const [, config] = dialogServiceMock.open.mock.lastCall as [unknown, { data: unknown }];
    expect(config.data).toEqual({ adapter, display });
  });

  it('refreshes page one only once an import actually ran', async () => {
    await build();
    component['openBulkImport']();

    onClose$.next(false);
    expect(storeMock['reloadFirstPage']).not.toHaveBeenCalled();

    onClose$.next(true);
    expect(storeMock['reloadFirstPage']).toHaveBeenCalled();
  });

  it('names every lifecycle status rather than leaving a bare number on the chip', async () => {
    await build();

    expect(component['statusLabel'](BulkImportJobStatus.CompletedWithErrors)).toBe(
      'Completed with errors',
    );
    expect(component['statusSeverity'](BulkImportJobStatus.Failed)).toBe('danger');
    expect(component['statusSeverity'](BulkImportJobStatus.Completed)).toBe('success');
  });

  it('tells the reader the list is scoped to their own imports', async () => {
    await build();

    expect(fixture.nativeElement.textContent).toContain('only the imports you ran yourself');
  });
});
