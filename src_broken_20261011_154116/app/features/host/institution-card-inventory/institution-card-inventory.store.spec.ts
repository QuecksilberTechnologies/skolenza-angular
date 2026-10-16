import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DeviceDdlOptionsApi, InstitutionCardMasterApi, InstitutionsApi } from '@core/services';
import { InstitutionCardMasterRow } from '@shared/interfaces';

import { InstitutionCardInventoryStore } from './institution-card-inventory.store';

function createCard(overrides: Partial<InstitutionCardMasterRow> = {}): InstitutionCardMasterRow {
  return {
    id: 'CARD-0001',
    institutionId: 'TEN00005',
    cardNumber: 'RFID-000123',
    cardReference: null,
    purchaseCurrencyCode: null,
    unitPurchasePriceExcludingTax: 250,
    supplierCountryId: null,
    supplierStateId: null,
    placeOfSupplyCountryId: null,
    placeOfSupplyStateId: null,
    supplierName: null,
    supplierTaxRegistrationNumber: null,
    purchaseInvoiceNumber: null,
    purchaseInvoiceDate: null,
    taxTreatment: 1,
    cgstRate: null,
    cgstAmount: null,
    sgstRate: null,
    sgstAmount: null,
    igstRate: null,
    igstAmount: null,
    foreignTaxLabel: null,
    foreignTaxRate: null,
    foreignTaxAmount: null,
    customsDutyAmount: null,
    freightAmount: null,
    isActive: true,
    ...overrides,
  };
}

describe('InstitutionCardInventoryStore', () => {
  const institutionCardMasterApiMock = {
    getInstitutionCardMasters: vi.fn(),
    setInstitutionCardMasterStatus: vi.fn(),
    deleteInstitutionCardMaster: vi.fn(),
  };
  const institutionsApiMock = { getInstitutions: vi.fn() };
  const deviceDdlOptionsApiMock = { getInstitutionCardInventory: vi.fn() };

  /** The write calls are institution-scoped, so the store under test starts with a institution chosen. */
  const createStore = (cardMasters: InstitutionCardMasterRow[]) => {
    const store = TestBed.inject(InstitutionCardInventoryStore);
    patchState(store as never, { institutionId: 'TEN00005', cardMasters });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    institutionCardMasterApiMock.getInstitutionCardMasters.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    institutionCardMasterApiMock.setInstitutionCardMasterStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    institutionCardMasterApiMock.deleteInstitutionCardMaster.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );
    institutionsApiMock.getInstitutions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    deviceDdlOptionsApiMock.getInstitutionCardInventory.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        InstitutionCardInventoryStore,
        { provide: InstitutionCardMasterApi, useValue: institutionCardMasterApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
        { provide: DeviceDdlOptionsApi, useValue: deviceDdlOptionsApiMock },
      ],
    });
  });

  it('stays idle until a institution is chosen', async () => {
    // Unlike `InstitutionDevice`, `get-all` has no "every institution" view — it answers 400 without a
    // `InstitutionId`, so the resource must not fire before one is picked.
    TestBed.inject(InstitutionCardInventoryStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionCardMasterApiMock.getInstitutionCardMasters).not.toHaveBeenCalled();
    expect(institutionsApiMock.getInstitutions).toHaveBeenCalled();
  });

  it('re-queries with every selected filter', async () => {
    const store = TestBed.inject(InstitutionCardInventoryStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setInstitutionId('TEN00005');
    store.setCardStatus('2');
    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionCardMasterApiMock.getInstitutionCardMasters).toHaveBeenLastCalledWith({
      Search: '',
      InstitutionId: 'TEN00005',
      CardStatus: '2',
      IsActive: true,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createCard({ id: 'CARD-0007' })]);
    institutionCardMasterApiMock.getInstitutionCardMasters.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.cardMasters()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });

  describe('toggleActive', () => {
    it('sends the flipped status for the row', () => {
      const store = createStore([createCard({ id: 'CARD-0007', isActive: true })]);

      store.toggleActive(store.cardMasters()[0]);

      expect(institutionCardMasterApiMock.setInstitutionCardMasterStatus).toHaveBeenCalledWith({
        id: 'CARD-0007',
        isActive: false,
        institutionId: 'TEN00005',
      });
    });

    it('clears the row spinner when the call fails', () => {
      institutionCardMasterApiMock.setInstitutionCardMasterStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createCard({ id: 'CARD-0007', isActive: true })]);

      store.toggleActive(store.cardMasters()[0]);

      expect(store.cardMasters()).toEqual([
        expect.objectContaining({ id: 'CARD-0007', isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteCardMaster', () => {
    // `delete` answers 400 without the institution, the same way `get-by-id` does.
    it('sends the row id and the institution', () => {
      const store = createStore([createCard({ id: 'CARD-0007' })]);

      store.deleteCardMaster(store.cardMasters()[0]);

      expect(institutionCardMasterApiMock.deleteInstitutionCardMaster).toHaveBeenCalledWith(
        'CARD-0007',
        'TEN00005',
      );
    });

    // Under "Any institution" the filter holds no id, so the institution has to come off the row.
    it('takes the institution from the row, not the filter', () => {
      const store = TestBed.inject(InstitutionCardInventoryStore);
      patchState(store as never, {
        cardMasters: [createCard({ id: 'CARD-0007', institutionId: 'TEN00009' })],
      });

      store.deleteCardMaster(store.cardMasters()[0]);

      expect(store.institutionId()).toBeNull();
      expect(institutionCardMasterApiMock.deleteInstitutionCardMaster).toHaveBeenCalledWith(
        'CARD-0007',
        'TEN00009',
      );
    });
  });
});
