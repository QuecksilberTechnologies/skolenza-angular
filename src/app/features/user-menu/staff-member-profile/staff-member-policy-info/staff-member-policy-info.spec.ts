import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import StaffMemberPolicyInfo from './staff-member-policy-info';
import {
  matchesFilters,
  overlapsYear,
  policyYears,
  PublishedPolicy,
} from './staff-member-policy-info.model';
import { StaffMemberPolicyInfoStore } from './staff-member-policy-info.store';

const policy = (overrides: Partial<PublishedPolicy> = {}): PublishedPolicy => ({
  policyId: 1,
  versionId: 11,
  versionNumber: 1,
  code: 'CL',
  name: 'Casual Leave',
  policyTypeName: 'Leave',
  effectiveFrom: '2026-04-01',
  effectiveTo: '2027-03-31',
  ...overrides,
});

describe('staffMember-policy-info model', () => {
  it('matches a year the effective window touches', () => {
    expect(overlapsYear(policy(), 2026)).toBe(true);
    expect(overlapsYear(policy(), 2027)).toBe(true);
    expect(overlapsYear(policy(), 2025)).toBe(false);
    expect(overlapsYear(policy({ effectiveTo: null }), 2030)).toBe(true);
    expect(overlapsYear(policy({ effectiveFrom: null }), 2026)).toBe(false);
  });

  it('combines search, version and year', () => {
    const filters = { search: 'leave', versionNumber: 1, year: 2026 };
    expect(matchesFilters(policy(), filters)).toBe(true);
    expect(matchesFilters(policy(), { ...filters, versionNumber: 2 })).toBe(false);
    expect(matchesFilters(policy(), { ...filters, search: 'sick' })).toBe(false);
  });

  it('lists every covered year newest first, an open end running to this year', () => {
    expect(
      policyYears([policy(), policy({ effectiveFrom: '2024-01-01', effectiveTo: null })], 2026),
    ).toEqual([2027, 2026, 2025, 2024]);
    expect(policyYears([], 2026)).toEqual([]);
  });
});

describe('StaffMemberPolicyInfo', () => {
  const listItem = (id: number, name: string) => ({
    id,
    code: name.slice(0, 2).toUpperCase(),
    name,
    policyTypeId: 3,
    isActive: true,
    currentVersionId: id * 10,
    versionNumber: 2,
    status: 'Published',
  });
  const page = (pageNumber: number, data: ReturnType<typeof listItem>[]) =>
    of({
      isSucceeded: true,
      message: '',
      errors: [],
      data,
      pageNumber,
      pageSize: 100,
      totalRecords: 2,
      totalPages: 2,
    });

  let api: Record<string, ReturnType<typeof vi.fn>>;
  let showMessage: ReturnType<typeof vi.fn>;

  async function render() {
    const fixture = TestBed.createComponent(StaffMemberPolicyInfo);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture.debugElement.injector.get(StaffMemberPolicyInfoStore);
  }

  beforeEach(async () => {
    showMessage = vi.fn();
    api = {
      getLookups: vi.fn(() =>
        of({
          isSucceeded: true,
          data: { statuses: [{ id: 5, code: 'PUBLISHED', name: 'Published' }] },
        }),
      ),
      getPolicyTypes: vi.fn(() => of({ isSucceeded: true, data: [{ id: 3, name: 'Leave' }] })),
      getPolicies: vi.fn(({ pageNumber }: { pageNumber: number }) =>
        pageNumber === 1
          ? page(1, [listItem(2, 'Sick Leave')])
          : page(2, [listItem(1, 'Annual Leave')]),
      ),
      getPolicyVersion: vi.fn(() =>
        of({
          isSucceeded: true,
          data: { effectiveFrom: '2026-01-01T00:00:00', effectiveTo: null },
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [StaffMemberPolicyInfo],
      providers: [
        { provide: DialogService, useValue: { open: vi.fn() } },
        { provide: InstitutionPolicyApi, useValue: api },
        { provide: Common, useValue: { showMessage } },
        {
          provide: FeaturePageStore,
          useValue: {
            whenLoaded: () => Promise.resolve(),
            moduleOperationIds: () => ({ ModuleId: 1, OperationId: 1 }),
            canPerform: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  it('reads every page of Published versions, dated from their version detail', async () => {
    const store = await render();

    expect(api['getPolicies']).toHaveBeenCalledTimes(2);
    expect(api['getPolicies']).toHaveBeenCalledWith(expect.objectContaining({ statusId: 5 }));
    expect(
      store.policies().map((policy) => [policy.name, policy.versionId, policy.effectiveFrom]),
    ).toEqual([
      ['Annual Leave', 10, '2026-01-01'],
      ['Sick Leave', 20, '2026-01-01'],
    ]);
  });

  it('lists nothing when the Published status cannot be resolved', async () => {
    api['getLookups'].mockReturnValue(of({ isSucceeded: false, message: 'Denied', data: null }));

    const store = await render();

    expect(api['getPolicies']).not.toHaveBeenCalled();
    expect(store.policies()).toEqual([]);
    expect(showMessage).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('keeps a row whose detail failed, undated, and says so', async () => {
    api['getPolicyVersion'].mockReturnValue(of({ isSucceeded: false, data: null }));

    const store = await render();

    expect(store.policies().every((policy) => policy.effectiveFrom === null)).toBe(true);
    expect(showMessage).toHaveBeenCalledWith(
      'Some policy dates could not be loaded. Refresh to try again.',
      'error',
    );
  });
});
