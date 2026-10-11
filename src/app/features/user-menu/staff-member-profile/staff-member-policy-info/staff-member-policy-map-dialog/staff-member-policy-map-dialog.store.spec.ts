import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { InstitutionPolicyAssignmentCandidate } from '@shared/interfaces';

import { PublishedPolicy } from '../staff-member-policy-info.model';
import { StaffMemberPolicyMapDialogStore } from './staff-member-policy-map-dialog.store';

const candidate = (staffMemberId: string, staffMemberName: string): InstitutionPolicyAssignmentCandidate => ({
  staffMemberId,
  staffMemberCode: staffMemberId.toUpperCase(),
  staffMemberName,
  staffEmploymentTypeId: null,
  staffEmploymentTypeName: null,
  departmentId: null,
  departmentName: null,
  designationId: null,
  designationName: null,
  isAssigned: false,
});

const policy: PublishedPolicy = {
  policyId: 1,
  versionId: 11,
  versionNumber: 1,
  code: 'CL',
  name: 'Casual Leave',
  policyTypeName: 'Leave',
  effectiveFrom: '2099-01-01',
  effectiveTo: '2099-12-31',
};

describe('StaffMemberPolicyMapDialogStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    api = {
      getAssignmentCandidates: vi.fn((_versionId: number, req: { search?: string }) =>
        of({
          isSucceeded: true,
          data: {
            totalRecords: 1,
            staffMembers: [req.search ? candidate('b', 'Bea') : candidate('a', 'Ada')],
            departments: [],
          },
        }),
      ),
      assignPolicy: vi.fn(() => of({ isSucceeded: true, message: 'Mapped', data: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        StaffMemberPolicyMapDialogStore,
        { provide: DynamicDialogConfig, useValue: { data: { policy } } },
        { provide: InstitutionPolicyApi, useValue: api },
        { provide: Common, useValue: { showMessage: vi.fn() } },
        {
          provide: FeaturePageStore,
          useValue: {
            whenLoaded: () => Promise.resolve(),
            moduleOperationIds: () => ({ ModuleId: 1, OperationId: 1 }),
          },
        },
      ],
    });
  });

  it('keeps a pick listed after a search drops it, and maps it from the version start', async () => {
    const store = TestBed.inject(StaffMemberPolicyMapDialogStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setSelectedIds(['a']);
    store.setSearch('bea' as Parameters<typeof store.setSearch>[0]);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.options().map((option) => option.staffMemberId)).toEqual(['a', 'b']);

    const onMapped = vi.fn();
    store.assign(onMapped);

    expect(api['assignPolicy']).toHaveBeenCalledWith(
      expect.objectContaining({
        policyVersionId: 11,
        staffMemberIds: ['a'],
        effectiveFrom: '2099-01-01',
        effectiveTo: '2099-12-31',
      }),
    );
    expect(onMapped).toHaveBeenCalled();
  });

  it('shows a mapped row ticked but never sends it as a pick', async () => {
    api['getAssignmentCandidates'].mockReturnValue(
      of({
        isSucceeded: true,
        data: {
          totalRecords: 2,
          staffMembers: [{ ...candidate('a', 'Ada'), isAssigned: true }, candidate('b', 'Bea')],
          departments: [],
        },
      }),
    );
    const store = TestBed.inject(StaffMemberPolicyMapDialogStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.checkedIds()).toEqual(['a']);

    store.setSelectedIds(['a', 'b']);

    expect(store.selectedIds()).toEqual(['b']);
    expect(store.checkedIds()).toEqual(['a', 'b']);
  });

  it('lists locations only when the API returns them, and filters by the picked one', async () => {
    const store = TestBed.inject(StaffMemberPolicyMapDialogStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.locations()).toEqual([]);

    api['getAssignmentCandidates'].mockReturnValue(
      of({
        isSucceeded: true,
        data: {
          totalRecords: 1,
          staffMembers: [{ ...candidate('a', 'Ada'), locationId: 5, locationName: 'Dubai' }],
          departments: [],
          locations: [{ id: 5, name: 'Dubai', staffMemberCount: 1 }],
        },
      }),
    );
    store.setLocationId(5);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(api['getAssignmentCandidates']).toHaveBeenLastCalledWith(
      11,
      expect.objectContaining({ locationId: 5 }),
    );
    expect(store.locations().map((location) => location.name)).toEqual(['Dubai']);
    expect(store.options()[0].locationName).toBe('Dubai');
  });
});
