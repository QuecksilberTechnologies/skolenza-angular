import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleOperationRow } from '@shared/interfaces';

import { ModuleOperationDetail } from './module-operation-detail';

function createModuleOperation(overrides: Partial<ModuleOperationRow> = {}): ModuleOperationRow {
  return {
    id: 1,
    moduleOperationMappingId: 42,
    moduleId: 10,
    moduleName: 'Assets',
    operationId: 2,
    operationName: 'Add',
    dataViewStructureId: 7,
    pageTypeId: 3,
    pageURL: '/app/assets',
    iconURL: 'pi pi-box',
    isCommonItem: false,
    isOperational: true,
    priority: 0,
    remark: null,
    isActive: true,
    addedById: 1,
    addedDateTime: '2025-07-04T23:49:47.303Z',
    updatedById: null,
    updatedDateTime: null,
    ...overrides,
  };
}

describe('ModuleOperationDetail', () => {
  let component: ModuleOperationDetail;
  let fixture: ComponentFixture<ModuleOperationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModuleOperationDetail] }).compileComponents();

    fixture = TestBed.createComponent(ModuleOperationDetail);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('moduleOperation', createModuleOperation());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the fields the grid has no column for', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('pi pi-box');
    expect(text).toContain('42');
    expect(text).toContain('7');
    expect(text).toContain('3');
  });

  it('should render a dash for a blank remark but keep a zero priority', () => {
    const fields = [...(fixture.nativeElement as HTMLElement).querySelectorAll('div.flex-col')];

    const remark = fields.find((el) => el.textContent?.includes('Remark'))?.textContent?.trim();
    const priority = fields.find((el) => el.textContent?.includes('Priority'))?.textContent?.trim();

    expect(remark).toContain('—');
    // A real 0, not a blank.
    expect(priority).toContain('0');
  });

  it('should label the dialog with the record-scoped title id', () => {
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');

    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('module-operation-detail-title-1');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#module-operation-detail-title-1'),
    ).toBeTruthy();
  });

  it('should emit closePopup from the close button', () => {
    let closed = false;
    component.closePopup.subscribe(() => (closed = true));

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'button[aria-label="Close module operation details"]',
      ) as HTMLButtonElement
    ).click();

    expect(closed).toBe(true);
  });

  it('should only offer the edit action when the caller allows it', () => {
    const editButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Edit Mapping'),
      );

    expect(editButton()).toBeFalsy();

    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();

    let emitted: ModuleOperationRow | null = null;
    component.editModuleOperation.subscribe((row) => (emitted = row));
    editButton()?.click();

    expect(emitted).toEqual(createModuleOperation());
  });

  it('should hide the audit card when the payload carries no audit columns', () => {
    fixture.componentRef.setInput(
      'moduleOperation',
      createModuleOperation({ addedById: null, addedDateTime: null }),
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Added By');
  });
});
