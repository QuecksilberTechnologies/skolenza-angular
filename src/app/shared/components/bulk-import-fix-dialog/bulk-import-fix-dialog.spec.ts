import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { vi } from 'vitest';

import {
  BulkImportFieldConfig,
  BulkImportFixDialogData,
  BulkImportFixResult,
  BulkImportRow,
  BulkImportRowStatus,
} from '@shared/interfaces';

import { BulkImportFixDialog } from './bulk-import-fix-dialog';

const SOURCE_COLUMNS = ['WidgetName', 'DepartmentId', 'GadgetId', 'StartsOn', 'IsActive'];

const departments = signal<readonly { id: number; departmentName: string }[]>([
  { id: 1, departmentName: 'Engineering' },
]);
const gadgets = signal<readonly { id: number; gadgetName: string }[]>([]);
const loadGadgetsFor = vi.fn<(parent: string) => void>();

const fields: readonly BulkImportFieldConfig[] = [
  { column: 'WidgetName', label: 'Widget name', section: 'Basics', required: true },
  {
    column: 'DepartmentId',
    label: 'Department',
    section: 'Basics',
    type: 'select',
    required: true,
    options: departments,
    optionLabel: 'departmentName',
  },
  {
    column: 'GadgetId',
    label: 'Gadget',
    section: 'Basics',
    type: 'select',
    dependsOn: 'DepartmentId',
    loadOptions: loadGadgetsFor,
    options: gadgets,
    optionLabel: 'gadgetName',
  },
  { column: 'StartsOn', label: 'Starts on', section: 'Dates', type: 'date', required: true },
  { column: 'IsActive', label: 'Is active', section: 'Dates', type: 'switch' },
];

function row(rowNumber: number, overrides: Partial<BulkImportRow> = {}): BulkImportRow {
  return {
    processed: false,
    rowNumber,
    values: {
      WidgetName: `Widget ${rowNumber}`,
      DepartmentId: '1',
      GadgetId: '7',
      StartsOn: '2026-04-15',
      IsActive: 'true',
    },
    status: BulkImportRowStatus.Invalid,
    existingId: null,
    errors: ['DepartmentId must be active.'],
    ...overrides,
  };
}

describe('BulkImportFixDialog', () => {
  let component: BulkImportFixDialog;
  let fixture: ComponentFixture<BulkImportFixDialog>;
  const close = vi.fn();

  const display: BulkImportFixDialogData['display'] = {
    entityLabelSingular: 'widget',
    entityLabelPlural: 'widgets',
    columnHints: [],
    pastePlaceholder: '',
    templateFileName: 'Widget-template.csv',
    reportFileNamePrefix: 'Widget-import',
    rowSummaryField: 'WidgetName',
  };

  async function open(overrides: Partial<BulkImportFixDialogData> = {}): Promise<void> {
    const data: BulkImportFixDialogData = {
      rows: [row(2), row(3)],
      sourceColumns: SOURCE_COLUMNS,
      columnMapping: {},
      fields,
      display,
      ...overrides,
    };

    await TestBed.configureTestingModule({
      imports: [BulkImportFixDialog],
      providers: [
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkImportFixDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** What the dialog closed with, as the wizard would receive it. */
  function closedWith(): BulkImportFixResult {
    return close.mock.calls.at(-1)?.[0];
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    close.mockClear();
    loadGadgetsFor.mockClear();
  });

  it('opens on the first row when it was opened from the whole list', async () => {
    await open();

    expect(component['activeRow']().rowNumber).toBe(2);
    expect(component['positionLabel']()).toBe('Row 1 of 2');
  });

  it('opens on the row it was sent to', async () => {
    await open({ startRowNumber: 3 });

    expect(component['activeRow']().rowNumber).toBe(3);
  });

  it('falls back to the first row when the one it was sent to is not invalid', async () => {
    await open({ startRowNumber: 99 });

    expect(component['activeRow']().rowNumber).toBe(2);
  });

  it('groups the fields into the sections they name', async () => {
    await open();

    expect(component['sections']().map((section) => section.heading)).toEqual(['Basics', 'Dates']);
  });

  it('reads the sheet into the shapes the controls want', async () => {
    await open();

    expect(component['model']()['WidgetName']).toBe('Widget 2');
    expect(component['model']()['IsActive']).toBe(true);
    expect(component['model']()['StartsOn']).toBeInstanceOf(Date);
  });

  it('leaves a date the sheet wrote in some other format unparsed, rather than guessing', async () => {
    await open({ rows: [row(2, { values: { ...row(2).values, StartsOn: '15/04/2026' } })] });

    expect(component['model']()['StartsOn']).toBeNull();
  });

  it('closes with nothing when no value was touched', async () => {
    await open();
    component['done']();

    expect(closedWith().size).toBe(0);
  });

  it('closes with only the columns that moved', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['done']();

    expect(closedWith().get(2)).toEqual({ WidgetName: 'Renamed' });
  });

  it('writes a flag back in the casing the sheet uses', async () => {
    await open();
    component['model'].update((values) => ({ ...values, IsActive: false }));
    component['done']();

    expect(closedWith().get(2)).toEqual({ IsActive: 'false' });
  });

  it('writes a date back as yyyy-MM-dd, not as an instant', async () => {
    await open();
    component['model'].update((values) => ({ ...values, StartsOn: new Date(2027, 0, 5) }));
    component['done']();

    expect(closedWith().get(2)).toEqual({ StartsOn: '2027-01-05' });
  });

  it('keeps corrections when the user comes back to a row', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['goTo'](1);
    component['goTo'](0);

    expect(component['model']()['WidgetName']).toBe('Renamed');
  });

  it('puts the rejected values back when the row is reset', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['resetRow']();
    component['done']();

    expect(closedWith().size).toBe(0);
  });

  it('saves the row on screen and moves on', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['saveAndNext']();

    expect(component['activeRow']().rowNumber).toBe(3);
    expect(close).not.toHaveBeenCalled();
  });

  it('closes once the last row is saved', async () => {
    await open();
    component['goTo'](1);
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['saveAndNext']();

    expect(closedWith().get(3)).toEqual({ WidgetName: 'Renamed' });
  });

  it('cancels with nothing, whatever was typed', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['close']();

    expect(closedWith()).toBeUndefined();
  });

  it('asks for the dependent list the row implies as soon as it opens', async () => {
    await open();

    expect(loadGadgetsFor).toHaveBeenCalledWith('1');
  });

  it('clears a dependent column and refetches its list when the parent moves', async () => {
    await open();
    loadGadgetsFor.mockClear();
    component['model'].update((values) => ({ ...values, DepartmentId: '2' }));
    component['onFieldChange'](fields[1]);

    expect(component['model']()['GadgetId']).toBe('');
    expect(loadGadgetsFor).toHaveBeenCalledWith('2');
  });

  it('puts the server complaint on the column it names, before anything is touched', async () => {
    await open();

    expect(component['f']['DepartmentId']().errors()[0].message).toBe(
      'DepartmentId must be active.',
    );
  });

  it('drops that complaint once the column it is about is edited', async () => {
    await open();
    component['model'].update((values) => ({ ...values, DepartmentId: '2' }));

    expect(component['f']['DepartmentId']().errors()).toHaveLength(0);
  });

  it('shows a sentence naming no column against the row instead of losing it', async () => {
    await open({ rows: [row(2, { errors: ['The institution has no seats left.'] })] });

    expect(component['rowLevelErrors']()).toEqual(['The institution has no seats left.']);
  });

  it('offers the lookup ids as strings, so the select can match what the sheet carries', async () => {
    await open();

    // `p-select` matches its model against `option[optionValue]` by identity, and the sheet's
    // `"1"` would never match a lookup's `1`.
    expect(component['options'](fields[1])).toEqual([{ id: '1', departmentName: 'Engineering' }]);
  });

  it('will not send back an unreadable date the user left alone', async () => {
    // The sheet wrote a date this importer cannot read, so the picker opens empty. Saving that
    // would record no change and re-upload the rejected cell verbatim, to be rejected identically.
    await open({ rows: [row(2, { values: { ...row(2).values, StartsOn: '15/04/2026' } })] });
    expect(component['model']()['StartsOn']).toBeNull();

    component['done']();

    expect(close).not.toHaveBeenCalled();

    component['model'].update((values) => ({ ...values, StartsOn: new Date(2026, 3, 15) }));
    component['done']();

    expect(closedWith().get(2)).toEqual({ StartsOn: '2026-04-15' });
  });

  it('corrects a flag the sheet wrote in a form the importer does not read', async () => {
    await open({ rows: [row(2, { values: { ...row(2).values, IsActive: 'Yes' } })] });
    component['done']();

    // The switch reads `Yes` as off, so saving has to write the off it is showing — leaving `Yes`
    // in place would send the same rejected cell back up.
    expect(closedWith().get(2)).toEqual({ IsActive: 'false' });
  });

  it('reloads the option lists a reset row belongs to, not just its values', async () => {
    await open();
    component['model'].update((values) => ({ ...values, DepartmentId: '2' }));
    component['onFieldChange'](fields[1]);
    loadGadgetsFor.mockClear();

    component['resetRow']();

    expect(loadGadgetsFor).toHaveBeenCalledWith('1');
  });

  it('survives a dependent column whose parent the sheet does not carry', async () => {
    const orphaned = fields.filter((field) => field.column !== 'DepartmentId');

    await open({
      fields: orphaned,
      sourceColumns: SOURCE_COLUMNS.filter((column) => column !== 'DepartmentId'),
      rows: [row(2)],
    });

    expect(() => component['f']['GadgetId']().disabled()).not.toThrow();
  });

  it('refuses to save a row the schema already rejects', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: '' }));
    component['done']();

    expect(close).not.toHaveBeenCalled();
    expect(component['saveBlocked']()).toBe(true);
  });

  it('still saves a row carrying only the complaint the server made', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: 'Renamed' }));
    component['done']();

    // `DepartmentId` is untouched, so its server error stands — and that row is exactly the one
    // the user is here to send again.
    expect(closedWith().get(2)).toEqual({ WidgetName: 'Renamed' });
  });

  it('reports a blank required column without a round trip', async () => {
    await open();
    component['model'].update((values) => ({ ...values, WidgetName: '  ' }));

    expect(component['f']['WidgetName']().errors()[0].message).toBe('Widget name is required');
  });
});
