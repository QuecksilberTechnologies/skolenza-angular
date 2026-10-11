import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of, throwError } from 'rxjs';

import { Common, HolidayCalandarApi, CampusApi } from '@core/services';

import { HolidayImportDialog, parseImportErrors } from './holiday-import-dialog';

describe('parseImportErrors', () => {
  const reason =
    'use a valid CampusId, HolidayName, ISO HolidayDate, boolean IsOptional, Description up to 255 characters and Icon up to 100 characters';

  it('splits the summary from row errors and merges rows sharing a reason', () => {
    const message =
      `Holiday import validation failed; no rows were saved. ` +
      [2, 3, 4, 5, 9].map((r) => `Row ${r}: ${reason}.`).join('. ') +
      ` Row 7: HolidayName is required.`;

    expect(parseImportErrors(message)).toEqual({
      summary: 'Holiday import validation failed; no rows were saved.',
      groups: [
        { rows: 'Rows 2–5, 9', reason: `${reason}.` },
        { rows: 'Row 7', reason: 'HolidayName is required.' },
      ],
    });
  });

  it('keeps a plain message as the summary with no row groups', () => {
    expect(parseImportErrors('File is empty.')).toEqual({ summary: 'File is empty.', groups: [] });
  });

  it('falls back to a generic summary when the message is blank', () => {
    expect(parseImportErrors('').summary).toBe('Holiday import failed.');
  });
});

describe('HolidayImportDialog', () => {
  let fixture: ComponentFixture<HolidayImportDialog>;
  let component: HolidayImportDialog;
  const importHolidays = vi.fn();
  const showMessage = vi.fn();
  const close = vi.fn();
  const getCampuses = vi.fn(() =>
    of({ isSucceeded: true, data: [{ id: 42, locationName: 'Pune HQ' }] }),
  );

  const drop = (...names: string[]) =>
    component['onDrop'](names.map((name) => new File(['x'], name)) as unknown as FileList);

  const render = async () => {
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => vi.unstubAllGlobals());

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [HolidayImportDialog],
      providers: [
        { provide: HolidayCalandarApi, useValue: { importHolidays } },
        { provide: Common, useValue: { showMessage } },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: CampusApi, useValue: { getCampuses } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HolidayImportDialog);
    component = fixture.componentInstance;
    await render();
  });

  it('downloads a CSV template that starts with the header row', async () => {
    const createObjectURL = vi.fn((_: Blob) => 'blob:template');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    component['downloadTemplate']();

    const blob = createObjectURL.mock.calls[0][0];
    expect(await blob.text()).toMatch(/^CampusId,HolidayName,HolidayDate,IsOptional/);
  });

  it('loads active locations for the dropdown', () => {
    expect(getCampuses).toHaveBeenCalledWith({ IsActive: true, PageSize: 500 });
    expect(component['locations']()).toEqual([{ id: 42, locationName: 'Pune HQ' }]);
  });

  it('fills the chosen location id into the template and the paste example', async () => {
    const createObjectURL = vi.fn((_: Blob) => 'blob:template');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    component['locationId'].set(42);
    component['downloadTemplate']();

    expect(await createObjectURL.mock.calls[0][0].text()).toContain('\n42,Republic Day,');
    expect(component['pastePlaceholder']()).toContain('\n42,Republic Day,');
  });

  it('accepts a single dropped .csv file', () => {
    drop('holidays.csv');

    expect(component['file']()?.name).toBe('holidays.csv');
    expect(component['importErrors']()).toBeNull();
  });

  it('rejects dropping more than one file', () => {
    drop('a.csv', 'b.csv');

    expect(component['file']()).toBeNull();
    expect(component['importErrors']()?.summary).toBe(
      'Drop one file at a time. An import reads a single file.',
    );
  });

  it('rejects a dropped file that is not .csv or .xlsx', () => {
    drop('holidays.pdf');

    expect(component['file']()).toBeNull();
    expect(component['importErrors']()?.summary).toBe(
      'holidays.pdf is not a CSV or XLSX file. Choose one of those.',
    );
  });

  it('shows the summary and grouped rows in the dialog when the import fails', async () => {
    importHolidays.mockReturnValue(
      throwError(
        () => new Error('Import failed. Row 2: bad date.. Row 3: bad date.. Row 5: name required.'),
      ),
    );
    drop('holidays.csv');

    component['onImport']();
    const el = await render();

    expect(el.querySelector('p-message')?.textContent).toContain('Import failed.');
    const rows = [...el.querySelectorAll('[role="alert"] li')].map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(rows).toEqual(['Rows 2–3: bad date.', 'Row 5: name required.']);
    expect(showMessage).toHaveBeenCalledWith('Import failed.', 'error');
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with the errors when the API reports a failure', async () => {
    importHolidays.mockReturnValue(
      of({ isSucceeded: false, message: 'Import failed. Row 4: bad date.' }),
    );
    drop('holidays.csv');

    component['onImport']();
    const el = await render();

    expect(el.querySelector('p-message')?.textContent).toContain('Import failed.');
    expect(el.querySelector('[role="alert"] li')?.textContent).toContain('Row 4');
    expect(showMessage).toHaveBeenCalledWith('Import failed.', 'error');
    expect(close).not.toHaveBeenCalled();
  });

  it('closes with true when the import succeeds', () => {
    importHolidays.mockReturnValue(of({ isSucceeded: true, message: 'Imported 3 holidays.' }));
    drop('holidays.csv');

    component['onImport']();

    expect(showMessage).toHaveBeenCalledWith('Imported 3 holidays.', 'success');
    expect(close).toHaveBeenCalledWith(true);
  });
});
