import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OperationsMasterApi } from '@core/services';

import OperationForm, { OperationFormData } from './operation-form';

describe('OperationForm', () => {
  const operationsApiMock = {
    getOperation: vi.fn(),
    addOperation: vi.fn(),
    updateOperation: vi.fn(),
  };
  const dialogRefMock = { close: vi.fn() };

  async function createFixture(data: OperationFormData): Promise<ComponentFixture<OperationForm>> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        { provide: OperationsMasterApi, useValue: operationsApiMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    });

    const fixture = TestBed.createComponent(OperationForm);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders every control the create payload needs', async () => {
    const fixture = await createFixture({});
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('#operationName')).toBeTruthy();
    expect(host.querySelector('#iconImage')).toBeTruthy();
    expect(host.querySelector('#remark')).toBeTruthy();
    expect(host.querySelector('p-select')).toBeTruthy();
    expect(host.querySelectorAll('p-toggleswitch')).toHaveLength(1);
    expect(host.querySelectorAll('p-button')).toHaveLength(2);
  });

  it('blocks the save until name, type and remark are filled', async () => {
    const fixture = await createFixture({});
    const form = fixture.componentInstance['f'];

    expect(form.operationName().errors().length).toBeGreaterThan(0);
    expect(form.operationType().errors().length).toBeGreaterThan(0);
    // `remark` is required by the API, not just by the UI.
    expect(form.remark().errors().length).toBeGreaterThan(0);
    expect(form().invalid()).toBe(true);
  });

  it('offers the four known operation types', async () => {
    const fixture = await createFixture({});
    expect(fixture.componentInstance['typeOptions']()).toHaveLength(4);
  });

  it('keeps an unknown operation type selectable when editing', async () => {
    operationsApiMock.getOperation.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          id: 9,
          operationName: 'View',
          operationType: 7,
          remark: 'Read only',
          iconImage: null,
          isActive: true,
        },
      }),
    );

    const fixture = await createFixture({ operation: { id: 9 } as never });

    // `operationType` is backend-defined; blanking the select would drop the value on save.
    expect(fixture.componentInstance['typeOptions']()).toContainEqual({ label: '#7', value: 7 });
    expect(fixture.componentInstance['model']().operationType).toBe(7);
  });

  it('hydrates an edit from the get-operation response', async () => {
    operationsApiMock.getOperation.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          id: 7,
          operationName: 'Approve',
          operationType: 2,
          remark: 'Approves submitted requests',
          iconImage: 'pi pi-check-circle',
          isActive: true,
        },
      }),
    );

    const fixture = await createFixture({ operation: { id: 7 } as never });

    const operationName = fixture.nativeElement.querySelector('#operationName') as HTMLInputElement;
    expect(operationName.value).toBe('Approve');
    expect(operationsApiMock.getOperation).toHaveBeenCalledWith(7);
  });
});
