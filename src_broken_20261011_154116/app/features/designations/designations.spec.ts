import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { SettledSearchTerm } from '@shared/interfaces';

import Designations from './designations';

describe('Designations', () => {
  let component: Designations;
  let fixture: ComponentFixture<Designations>;
  let dialogServiceMock: { open: ReturnType<typeof vi.fn> };
  let onClose$: Subject<boolean>;

  beforeEach(async () => {
    onClose$ = new Subject<boolean>();
    dialogServiceMock = {
      open: vi.fn().mockReturnValue({ onClose: onClose$.asObservable(), close: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [Designations],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        { provide: DialogService, useValue: dialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Designations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openBulkImport', () => {
    it('should open the bulk import dialog', () => {
      component.openBulkImport();
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Import Designations' }),
      );
    });

    it('should do nothing when the dialog closes without an import', () => {
      const reloadFirstPage = vi
        .spyOn(component.store, 'reloadFirstPage')
        .mockImplementation(() => {});
      component.openBulkImport();
      onClose$.next(false);
      expect(reloadFirstPage).not.toHaveBeenCalled();
    });

    it('should reload the first page once an import ran', () => {
      const reloadFirstPage = vi
        .spyOn(component.store, 'reloadFirstPage')
        .mockImplementation(() => {});
      component.openBulkImport();
      onClose$.next(true);
      expect(reloadFirstPage).toHaveBeenCalled();
    });
  });

  it('searchDesignations should send the term to the store from page 1', () => {
    const setSearch = vi.spyOn(component.store, 'setSearch').mockImplementation(() => {});
    component.table()!.first = 20;

    component.searchDesignations('lead' as SettledSearchTerm);

    expect(setSearch).toHaveBeenCalledWith('lead');
    expect(component.table()!.first).toBe(0);
  });
});
