import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError, Common, InstitutionsApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { StaffMemberCodePattern } from '@shared/interfaces';

import { StaffMemberCodeConfigurationStore } from './staffMember-code-configuration.store';

type Spy = ReturnType<typeof vi.fn>;

const pattern: StaffMemberCodePattern = {
  prefix: 'EMP',
  separator: '-',
  runningNumberLength: '4',
  includeYear: true,
  includeMonth: false,
  includeDepartment: false,
};

const previewRes = (over: Record<string, unknown> = {}) => ({
  isSucceeded: true,
  message: 'ok',
  errors: [],
  data: { previewHash: 'hash-1', canCommit: true, staffMembers: [], ...over },
});

describe('StaffMemberCodeConfigurationStore', () => {
  let institutionsApiMock: {
    getStaffMemberCodePattern: Spy;
    addStaffMemberCodePattern: Spy;
    updateStaffMemberCodePattern: Spy;
  };
  let commonMock: { showMessage: Spy };
  let store: InstanceType<typeof StaffMemberCodeConfigurationStore>;

  beforeEach(() => {
    institutionsApiMock = {
      getStaffMemberCodePattern: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'ok', errors: [], data: null })),
      addStaffMemberCodePattern: vi.fn().mockReturnValue(of(previewRes())),
      updateStaffMemberCodePattern: vi.fn().mockReturnValue(of(previewRes())),
    };
    commonMock = { showMessage: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        StaffMemberCodeConfigurationStore,
        { provide: InstitutionsApi, useValue: institutionsApiMock },
        { provide: Common, useValue: commonMock },
        {
          provide: FeaturePageStore,
          useValue: { moduleOperationIds: () => ({ ModuleId: 29, OperationId: 1 }) },
        },
      ],
    });
    store = TestBed.inject(StaffMemberCodeConfigurationStore);
    store.setInstitutionId('institution-1');
  });

  it('creates with POST when the institution has no pattern yet', () => {
    store.loadExistingPattern();
    store.preview(pattern);

    expect(institutionsApiMock.addStaffMemberCodePattern).toHaveBeenCalledWith({
      pattern,
      confirm: false,
      moduleId: 29,
      operationId: 1,
    });
    expect(institutionsApiMock.updateStaffMemberCodePattern).not.toHaveBeenCalled();
  });

  it('changes with PUT once a pattern exists', () => {
    institutionsApiMock.getStaffMemberCodePattern.mockReturnValue(
      of({ isSucceeded: true, message: 'ok', errors: [], data: pattern }),
    );
    store.loadExistingPattern();
    store.preview(pattern);

    expect(institutionsApiMock.updateStaffMemberCodePattern).toHaveBeenCalled();
    expect(institutionsApiMock.addStaffMemberCodePattern).not.toHaveBeenCalled();
  });

  it('treats a failed pattern read as "no pattern yet" rather than an error', () => {
    institutionsApiMock.getStaffMemberCodePattern.mockReturnValue(throwError(() => new Error('401')));

    store.loadExistingPattern();

    expect(store.hasExistingPattern()).toBe(false);
    expect(commonMock.showMessage).not.toHaveBeenCalled();
  });

  it('confirms with the same pattern and the hash the preview returned', () => {
    store.preview(pattern);
    store.apply(() => undefined);

    expect(institutionsApiMock.addStaffMemberCodePattern).toHaveBeenLastCalledWith({
      pattern,
      confirm: true,
      previewHash: 'hash-1',
      moduleId: 29,
      operationId: 1,
    });
  });

  it('refuses to apply without a preview', () => {
    store.apply(() => undefined);

    expect(institutionsApiMock.addStaffMemberCodePattern).not.toHaveBeenCalled();
  });

  it('refuses to apply a preview the backend will not commit', () => {
    institutionsApiMock.addStaffMemberCodePattern.mockReturnValue(of(previewRes({ canCommit: false })));
    store.preview(pattern);
    institutionsApiMock.addStaffMemberCodePattern.mockClear();

    store.apply(() => undefined);

    expect(institutionsApiMock.addStaffMemberCodePattern).not.toHaveBeenCalled();
  });

  it('discards a stale preview on 409 instead of silently re-previewing', () => {
    store.preview(pattern);
    institutionsApiMock.addStaffMemberCodePattern.mockReturnValue(
      throwError(() => new ApiError('Conflict', 409)),
    );

    store.apply(() => undefined);

    expect(store.hasPreview()).toBe(false);
    const [message, severity] = commonMock.showMessage.mock.lastCall as [string, string];
    expect(message).toContain('Preview again');
    expect(severity).toBe('warn');
  });

  it('drops the preview when the pattern is edited', () => {
    store.preview(pattern);
    expect(store.hasPreview()).toBe(true);

    store.clearPreview();

    expect(store.hasPreview()).toBe(false);
  });

  it('counts the rows that change, the rows with issues and the last used number', () => {
    institutionsApiMock.addStaffMemberCodePattern.mockReturnValue(
      of(
        previewRes({
          lastUsedNumber: 200,
          staffMembers: [
            { name: 'A', currentCode: 'E-1', proposedCode: 'EMP-0001', errors: [] },
            { name: 'B', currentCode: 'EMP-0002', proposedCode: 'EMP-0002', errors: [] },
            {
              name: 'C',
              currentCode: 'E-3',
              proposedCode: 'EMP-0003',
              errors: ['No joining date'],
            },
          ],
        }),
      ),
    );

    store.preview(pattern);

    expect(store.changedCount()).toBe(2);
    expect(store.issueCount()).toBe(1);
    expect(store.lastUsedNumber()).toBe(200);
  });

  describe('isNoOp', () => {
    const unchanged = previewRes({
      staffMembers: [{ name: 'A', currentCode: 'EMP-0001', proposedCode: 'EMP-0001' }],
    });

    it('is true when the saved pattern is previewed and no code changes', () => {
      // The read sends the length as a number where the form holds a string.
      institutionsApiMock.getStaffMemberCodePattern.mockReturnValue(
        of({
          isSucceeded: true,
          message: 'ok',
          errors: [],
          data: { ...pattern, runningNumberLength: Number(pattern.runningNumberLength) },
        }),
      );
      institutionsApiMock.updateStaffMemberCodePattern.mockReturnValue(of(unchanged));
      store.loadExistingPattern();

      store.preview(pattern);

      expect(store.isNoOp()).toBe(true);
    });

    it('is false for a first-ever pattern, which still has to be saved', () => {
      institutionsApiMock.addStaffMemberCodePattern.mockReturnValue(of(unchanged));
      store.loadExistingPattern();

      store.preview(pattern);

      expect(store.isNoOp()).toBe(false);
    });

    it('is false when the pattern differs from the saved one, even if no code changes', () => {
      institutionsApiMock.getStaffMemberCodePattern.mockReturnValue(
        of({ isSucceeded: true, message: 'ok', errors: [], data: { ...pattern, prefix: 'OLD' } }),
      );
      institutionsApiMock.updateStaffMemberCodePattern.mockReturnValue(of(unchanged));
      store.loadExistingPattern();

      store.preview(pattern);

      expect(store.isNoOp()).toBe(false);
    });
  });

  it('flags a preview whose rows carry none of the fields the table reads', () => {
    institutionsApiMock.addStaffMemberCodePattern.mockReturnValue(
      of(previewRes({ staffMembers: [{ somethingElse: 'x' }] })),
    );

    store.preview(pattern);

    expect(store.isRowShapeUnknown()).toBe(true);
  });

  it('does not flag rows it can read', () => {
    institutionsApiMock.addStaffMemberCodePattern.mockReturnValue(
      of(previewRes({ staffMembers: [{ currentCode: 'EMP-0001', proposedCode: 'E-0001' }] })),
    );

    store.preview(pattern);

    expect(store.isRowShapeUnknown()).toBe(false);
  });
});
