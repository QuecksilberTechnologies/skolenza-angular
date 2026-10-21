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
import { MAX_PAGE_SIZE } from '@shared/utilities/paged-list';

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
  /** The tab list asks for its first page; a dialog picker pages through every row. */
  const firstPage = { pageNumber: 1, pageSize: 10 };
  const everyRow = { pageNumber: 1, pageSize: MAX_PAGE_SIZE };

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
      expect(api['getMasters']).toHaveBeenLastCalledWith(
        AcademicMasterType.CourseOffering,
        firstPage,
        false,
      );
      expect(component.tabs.map((tab) => tab.label)).toContain('Course Offerings');
    });

    it('fetches only the selected tab list on visit', () => {
      component.ngOnInit();

      expect(api['getMasters']).toHaveBeenCalledOnce();
      expect(api['getMasters']).toHaveBeenCalledWith(AcademicMasterType.Session, firstPage, false);
      expect(api['getTeachingAssignmentTypes']).not.toHaveBeenCalled();
    });

    it('fetches only the picker lists the opened dialog needs', () => {
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);
      component.selectedTab.set(AcademicMasterType.Section);

      component.openMasterDialog();

      expect(api['getMasters'].mock.calls).toEqual([[AcademicMasterType.Group, everyRow, false]]);
    });

    it('replaces an unknown tab segment with sessions', () => {
      component.ngOnInit();
      paramMap.next(convertToParamMap({ tab: 'nope' }));

      expect(navigate).toHaveBeenCalledWith(['..', 'sessions'], {
        relativeTo: TestBed.inject(ActivatedRoute),
        replaceUrl: true,
      });
    });

    it('gives each tab the URL segment that selects it', () => {
      expect(component.tabs.find((tab) => tab.id === AcademicMasterType.Subject)?.route).toBe(
        'subjects',
      );
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
      expect(component.emptyMessage(0)).toBe('No sessions yet');
      expect(component.emptyDetail(0)).toBe('Sessions appear here once added.');
      component.setStatusFilter('inactive');
      expect(component.emptyMessage(1)).toBe('No inactive sessions');
      expect(component.emptyDetail(1)).toBe('Change the status filter to see all sessions.');
    });

    it('says only the loaded pages were checked while more pages remain', () => {
      api['getMasters'].mockReturnValue(
        of({ isSucceeded: true, message: '', data: [session], totalRecords: 30 }),
      );
      component.records.reload();
      component.setStatusFilter('inactive');

      expect(component.emptyMessage(1)).toBe('No inactive sessions on the loaded pages');
      expect(component.emptyDetail(1)).toBe(
        'Load more to check the rest, or change the status filter.',
      );
    });

    it('filters rows by status', () => {
      api['getMasters'].mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          data: [session, { ...session, id: 4, isActive: false }],
        }),
      );
      component.records.reload();
      component.setStatusFilter('inactive');

      expect(component.visibleRecords().map((item) => item.id)).toEqual([4]);
    });

    it('asks the server for active rows only when filtering by Active', () => {
      component.ngOnInit();
      component.setStatusFilter('active');

      expect(api['getMasters']).toHaveBeenLastCalledWith(
        AcademicMasterType.Session,
        firstPage,
        true,
      );
      // "Active" came back filtered, so an empty list may still hide inactive rows.
      expect(component.filterHidRows(0)).toBe(true);
      expect(component.emptyMessage(0)).toBe('No active sessions');

      component.setStatusFilter('inactive');

      expect(api['getMasters']).toHaveBeenLastCalledWith(
        AcademicMasterType.Session,
        firstPage,
        false,
      );
    });

    it('shows a rejected page as a failure, not as an empty tab', () => {
      api['getMasters'].mockReturnValue(
        of({ isSucceeded: false, message: 'Institution not configured', data: null }),
      );
      component.records.reload();

      expect(component.records.failed()).toBe(true);
      expect(TestBed.inject(Common).showMessage).toHaveBeenCalledWith(
        'Institution not configured',
        'error',
      );
    });
  });

  describe('staff member assignments', () => {
    beforeEach(() => setup({ staffMemberId: 'S-1' }));

    it('loads the staff profile and ignores master tab routing', () => {
      component.ngOnInit();

      expect(api['getStaffProfile']).toHaveBeenCalledWith('S-1');
      // Picker lists load only when a dialog opens.
      expect(api['getMasters']).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('fetches offerings, sections and assignment types when the teaching dialog opens', () => {
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);

      component.openTeachingDialog();

      expect(api['getMasters'].mock.calls).toEqual([
        [AcademicMasterType.CourseOffering, everyRow, false],
        [AcademicMasterType.Section, everyRow, false],
      ]);
      expect(api['getTeachingAssignmentTypes']).toHaveBeenCalledOnce();
    });
  });
});
