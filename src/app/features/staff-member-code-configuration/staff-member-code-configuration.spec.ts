import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, InstitutionsApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import StaffMemberCodeConfiguration from './staff-member-code-configuration';

type Spy = ReturnType<typeof vi.fn>;

const previewRes = (over: Record<string, unknown> = {}) => ({
  isSucceeded: true,
  message: 'ok',
  errors: [],
  data: {
    previewHash: 'hash-1',
    canCommit: true,
    staffMembers: [{ name: 'Aarav', currentCode: 'E-1', proposedCode: 'EMP-0001' }],
    ...over,
  },
});

describe('StaffMemberCodeConfiguration', () => {
  let fixture: ComponentFixture<StaffMemberCodeConfiguration>;
  let component: StaffMemberCodeConfiguration;

  let institutionsApiMock: Record<string, Spy>;
  let featurePageStoreMock: Record<string, Spy>;

  const build = async () => {
    fixture = TestBed.createComponent(StaffMemberCodeConfiguration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  beforeEach(() => {
    institutionsApiMock = {
      getStaffMemberCodePattern: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'ok', errors: [], data: null })),
      addStaffMemberCodePattern: vi.fn().mockReturnValue(of(previewRes())),
      updateStaffMemberCodePattern: vi.fn().mockReturnValue(of(previewRes())),
    };
    featurePageStoreMock = {
      moduleOperationIds: vi.fn().mockReturnValue({ ModuleId: 29, OperationId: 1 }),
      canPerform: vi.fn().mockReturnValue(true),
      displayNameOf: vi.fn().mockReturnValue('StaffMember Code Configuration'),
    };

    TestBed.configureTestingModule({
      imports: [StaffMemberCodeConfiguration],
      providers: [
        { provide: InstitutionsApi, useValue: institutionsApiMock },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            showMessage: vi.fn(),
            getLoginInfo: vi.fn().mockResolvedValue({ user: { institutionId: 'institution-1' } }),
          },
        },
      ],
    });
  });

  /**
   * The regression this file exists for: `clearPreview` reads the preview signals to decide whether
   * it has work to do, so an effect that calls it tracked depends on them, re-runs the moment a
   * preview arrives, and wipes it. The screen then never shows a preview and Apply never enables.
   */
  it('keeps a preview once it arrives', async () => {
    await build();

    component['onPreview']();
    await fixture.whenStable();

    expect(component.store.hasPreview()).toBe(true);
    expect(component.store.canCommit()).toBe(true);
    expect(component.store.rows()).toHaveLength(1);
  });

  it('discards the preview when the pattern is edited afterwards', async () => {
    await build();
    component['onPreview']();
    await fixture.whenStable();

    component['model'].set({
      prefix: 'STAFF',
      separator: '-',
      runningNumberLength: '4',
      includeYear: true,
      includeMonth: false,
      includeDepartment: false,
    });
    await fixture.whenStable();

    expect(component.store.hasPreview()).toBe(false);
  });

  it('renders the preview table once a preview is held', async () => {
    await build();
    component['onPreview']();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('EMP-0001');
  });

  it('asks before applying, and applies only once the user accepts', async () => {
    await build();
    component['onPreview']();
    await fixture.whenStable();

    const confirmation = fixture.debugElement.injector.get(ConfirmationService);
    const confirm = vi.spyOn(confirmation, 'confirm');
    const apply = vi.spyOn(component.store, 'apply').mockImplementation(() => undefined);

    component['onApply']();

    expect(confirm).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();

    confirm.mock.calls[0][0].accept?.();

    expect(apply).toHaveBeenCalledOnce();
  });

  it('marks a row whose code stays the same as unchanged', async () => {
    institutionsApiMock['addStaffMemberCodePattern'].mockReturnValue(
      of(
        previewRes({
          staffMembers: [
            { name: 'Aarav', currentCode: 'EMP-0001', proposedCode: 'EMP-0001' },
            { name: 'Diya', currentCode: 'E-2', proposedCode: 'EMP-0002' },
          ],
        }),
      ),
    );
    await build();
    component['onPreview']();
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text.match(/Unchanged/g)).toHaveLength(1);
    expect(text).toContain('1 of 2 staffMembers will change');
  });

  it('preselects the running number when the saved pattern returns it as a number', async () => {
    institutionsApiMock['getStaffMemberCodePattern'].mockReturnValue(
      of({
        isSucceeded: true,
        message: 'ok',
        errors: [],
        data: {
          prefix: 'QT',
          separator: '_',
          runningNumberLength: 5,
          includeYear: true,
          includeMonth: false,
          includeDepartment: false,
        },
      }),
    );
    await build();
    await fixture.whenStable();

    expect(component['model']().runningNumberLength).toBe('5');
  });

  it('opens on 4 digits when there is no saved pattern', async () => {
    await build();
    await fixture.whenStable();

    expect(component['model']().runningNumberLength).toBe('4');
  });

  it('shows the changed-only filter only when the preview mixes changed and unchanged rows', async () => {
    institutionsApiMock['addStaffMemberCodePattern'].mockReturnValue(
      of(
        previewRes({
          staffMembers: [
            { name: 'Aarav', currentCode: 'EMP-0001', proposedCode: 'EMP-0001' },
            { name: 'Diya', currentCode: 'E-2', proposedCode: 'EMP-0002' },
          ],
        }),
      ),
    );
    await build();
    component['onPreview']();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['canFilterChanged']()).toBe(true);
    expect(component['visibleRows']()).toHaveLength(2);

    component['changedOnly'].set(true);

    expect(component['visibleRows']().map((row) => row.name)).toEqual(['Diya']);
  });

  it('blocks Apply and says why when the saved pattern would change nothing', async () => {
    const saved = {
      prefix: 'EMP',
      separator: '-',
      runningNumberLength: 4,
      includeYear: true,
      includeMonth: false,
      includeDepartment: false,
    };
    institutionsApiMock['getStaffMemberCodePattern'].mockReturnValue(
      of({ isSucceeded: true, message: 'ok', errors: [], data: saved }),
    );
    institutionsApiMock['updateStaffMemberCodePattern'].mockReturnValue(
      of(
        previewRes({
          staffMembers: [{ name: 'Aarav', currentCode: 'EMP-0001', proposedCode: 'EMP-0001' }],
        }),
      ),
    );
    await build();
    await fixture.whenStable();
    component['onPreview']();
    await fixture.whenStable();
    fixture.detectChanges();

    const confirm = vi.spyOn(fixture.debugElement.injector.get(ConfirmationService), 'confirm');
    component['onApply']();

    expect(component.store.isNoOp()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('nothing to apply');
    expect(fixture.nativeElement.textContent).not.toContain('Unchanged');
  });

  it('builds a sample code from the pattern being edited', async () => {
    await build();

    expect(component['sampleCode']()).toBe('EMP-2026-0001');
  });
});
