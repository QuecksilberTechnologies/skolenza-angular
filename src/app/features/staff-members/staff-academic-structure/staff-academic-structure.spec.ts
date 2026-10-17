import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { BehaviorSubject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { AcademicMaster, AcademicMasterType } from '@shared/interfaces';

import { AcademicMasterDialog } from './academic-master-dialog/academic-master-dialog';
import StaffAcademicStructure from './staff-academic-structure';

describe('StaffAcademicStructure', () => {
  const session = {
    id: 3,
    code: 'AY-2026-27',
    name: '<img src=x onerror=alert(1)>',
    description: '',
    isActive: true,
    type: 1,
  } as AcademicMaster;

  let component: StaffAcademicStructure;
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let denied: Set<string>;
  let paramMap: BehaviorSubject<ParamMap>;
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let navigate: ReturnType<typeof vi.spyOn>;

  function setup(params: Record<string, string> = {}) {
    const empty = of({ isSucceeded: true, message: '', data: [] });
    const done = of({ isSucceeded: true, message: 'Done', data: true });
    denied = new Set();
    paramMap = new BehaviorSubject(convertToParamMap(params));
    api = {
      getMasters: vi.fn(() => empty),
      getTeachingAssignmentTypes: vi.fn(() => empty),
      getStaffProfile: vi.fn(() =>
        of({
          isSucceeded: true,
          message: '',
          data: { teachingAssignments: [], classTeacherAssignments: [] },
        }),
      ),
      deleteMaster: vi.fn(() => done),
      saveMaster: vi.fn(() => done),
    };
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        {
          provide: FeaturePageStore,
          useValue: {
            canPerformOrUnknown: (_module: string, operation: string) => !denied.has(operation),
          },
        },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params) }, paramMap },
        },
        { provide: StaffAcademicStructureApi, useValue: api },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new StaffAcademicStructure());
    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  }

  describe('master tabs', () => {
    beforeEach(() => setup({ tab: 'sessions' }));

    it('shows a breadcrumb back to the Staff Directory', () => {
      component.ngOnInit();

      expect(TestBed.inject(Common).setBreadcrumbItems).toHaveBeenCalledWith([
        { label: 'Staff Directory', routerLink: '/app/staff' },
        { label: 'Academic Structure' },
      ]);
    });

    it('selects and loads the tab named in the URL', () => {
      component.ngOnInit();
      paramMap.next(convertToParamMap({ tab: 'course-offerings' }));

      expect(component.selectedTab()).toBe(AcademicMasterType.CourseOffering);
      expect(api['getMasters']).toHaveBeenLastCalledWith(AcademicMasterType.CourseOffering, false);
      expect(component.tabs.map((tab) => tab.label)).toContain('Course Offerings');
    });

    it('replaces an unknown tab segment with sessions', () => {
      component.ngOnInit();
      paramMap.next(convertToParamMap({ tab: 'nope' }));

      expect(navigate).toHaveBeenCalledWith(['..', 'sessions'], {
        relativeTo: TestBed.inject(ActivatedRoute),
        replaceUrl: true,
      });
    });

    it('navigates to the clicked tab instead of switching in place', () => {
      component.ngOnInit();
      component.openTab(AcademicMasterType.Subject);

      expect(navigate).toHaveBeenCalledWith(['..', 'subjects'], {
        relativeTo: TestBed.inject(ActivatedRoute),
      });
      expect(component.selectedTab()).toBe(AcademicMasterType.Session);
    });

    it('asks before deactivating, escapes the name, and calls the API only on accept', () => {
      component.confirmMasterActive(session);

      expect(api['deleteMaster']).not.toHaveBeenCalled();
      const options = confirmSpy.mock.calls[0][0] as Confirmation;
      expect(options.acceptButtonStyleClass).toBe('p-button-danger');
      expect(options.message).toBe(
        'Deactivate <strong>&lt;img src=x onerror=alert(1)&gt;</strong>?',
      );
      options.accept?.();
      expect(api['deleteMaster']).toHaveBeenCalledWith(AcademicMasterType.Session, 3);
    });

    it('activates an inactive record by saving it with isActive true', () => {
      component.confirmMasterActive({ ...session, isActive: false });

      const options = confirmSpy.mock.calls[0][0] as Confirmation;
      expect(options.acceptButtonStyleClass).toBe('p-button-primary');
      options.accept?.();
      expect(api['saveMaster']).toHaveBeenCalledWith(
        AcademicMasterType.Session,
        expect.objectContaining({ id: 3, isActive: true }),
      );
    });

    it('keeps Deactivate out of the row menu without Delete permission', () => {
      denied.add('Delete');

      const items = component.masterActions(session);

      expect(items.find((item) => item.label === 'Edit')?.visible).toBe(true);
      expect(items.find((item) => item.label === 'Deactivate')?.visible).toBe(false);
    });

    it('hides the row menu when no action in it is permitted', () => {
      denied.add('Update');
      denied.add('Delete');

      expect(component.hasRowActions(true)).toBe(false);
    });

    it('opens the add dialog titled for the current tab', () => {
      const open = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);
      component.selectedTab.set(AcademicMasterType.CourseOffering);

      component.openMasterDialog();

      expect(open).toHaveBeenCalledWith(
        AcademicMasterDialog,
        expect.objectContaining({
          header: 'Add Course Offering',
          data: expect.objectContaining({ type: AcademicMasterType.CourseOffering }),
        }),
      );
    });

    it('names the tab and the next step in the empty state', () => {
      expect(component.emptyMessage(0)).toBe('No sessions yet. Use Add Session to create one.');
    });

    it('filters rows by status', () => {
      component.records.set([session, { ...session, id: 4, isActive: false }]);
      component.statusFilter = 'inactive';

      expect(component.visibleRecords().map((item) => item.id)).toEqual([4]);
    });
  });

  describe('staff member assignments', () => {
    beforeEach(() => setup({ staffMemberId: 'S-1' }));

    it('loads the staff profile and ignores master tab routing', () => {
      component.ngOnInit();

      expect(api['getStaffProfile']).toHaveBeenCalledWith('S-1');
      // Only the six reference lists load; no master tab list.
      expect(api['getMasters']).toHaveBeenCalledTimes(6);
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
