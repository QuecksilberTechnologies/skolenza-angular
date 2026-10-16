import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AssetCategoriesApi } from '@core/services';

import { AssetTypeManageDialog } from './asset-type-manage-dialog';

describe('AssetTypeManageDialog', () => {
  const assetCategoriesApiMock = { getAllAssetCategory: vi.fn() };

  const createFixture = (): ComponentFixture<AssetTypeManageDialog> => {
    const fixture = TestBed.createComponent(AssetTypeManageDialog);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    assetCategoriesApiMock.getAllAssetCategory.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    await TestBed.configureTestingModule({
      imports: [AssetTypeManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: AssetCategoriesApi, useValue: assetCategoriesApiMock },
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('still renders when the category lookup fails', async () => {
    // An errored resource makes `value()` throw, which aborts change detection for the
    // whole dialog instead of leaving the category select empty.
    assetCategoriesApiMock.getAllAssetCategory.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = createFixture();
    await fixture.whenStable();

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
