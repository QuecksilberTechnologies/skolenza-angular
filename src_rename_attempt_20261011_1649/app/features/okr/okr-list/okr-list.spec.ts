import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';
import { IOkr, SettledSearchTerm } from '@shared/interfaces';

import { OkrStore } from '../okr.store';
import OkrList from './okr-list';

const okr = { id: 'okr-1', title: 'Alpha' } as IOkr;

describe('OkrList', () => {
  let component: OkrList;
  let fixture: ComponentFixture<OkrList>;
  let storeMock: Record<string, ReturnType<typeof vi.fn>>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    storeMock = {
      okrs: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      totalRecords: vi.fn().mockReturnValue(0),
      pageSize: vi.fn().mockReturnValue(10),
      appliedFilters: vi.fn().mockReturnValue(null),
      appliedFilterCount: vi.fn().mockReturnValue(0),
      scope: vi.fn().mockReturnValue('my'),
      setScope: vi.fn(),
      loadOkrs: vi.fn(),
      setSearchTerm: vi.fn(),
      updateAppliedFilters: vi.fn(),
      deleteOkr: vi.fn(),
      archiveOkrs: vi.fn(),
      bulkDelete: vi.fn(),
      duplicateOkr: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OkrList],
      providers: [ConfirmationService],
    })
      .overrideComponent(OkrList, {
        set: { providers: [{ provide: OkrStore, useValue: storeMock }] },
      })
      .overrideProvider(Common, {
        useValue: { setPageHeaderInfo: vi.fn(), showMessage: vi.fn(), setBreadcrumbItems: vi.fn() },
      })
      .overrideProvider(AuthStore, { useValue: { roleTypeId: () => 1 } })
      .overrideProvider(ActivatedRoute, { useValue: { snapshot: { data: { scope: 'my' } } } })
      .overrideProvider(Router, { useValue: { navigate: vi.fn() } })
      .compileComponents();

    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    fixture = TestBed.createComponent(OkrList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets scope from route data on init', () => {
    expect(storeMock['setScope']).toHaveBeenCalledWith('my');
  });

  it('exposes canManage true for Admin role', () => {
    expect(component['canManage']()).toBe(true);
  });

  it('onSearch delegates to the store', () => {
    component.onSearch('alpha' as SettledSearchTerm);
    expect(storeMock['setSearchTerm']).toHaveBeenCalledWith('alpha');
  });

  it('view navigates to detail tagged with the current scope as origin', () => {
    const router = TestBed.inject(Router);
    component.view(okr);
    expect(router.navigate).toHaveBeenCalledWith(['/app/okr', 'okr-1'], {
      queryParams: { from: 'my' },
    });
  });

  it('confirmDelete requests confirmation then deletes on accept', () => {
    component.confirmDelete(okr);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mock.calls[0][0].accept!();
    expect(storeMock['deleteOkr']).toHaveBeenCalledWith(okr);
  });
});
