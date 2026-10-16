import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionModule } from '@shared/interfaces';

import { PermissionMatrix } from './permission-matrix';

describe('PermissionMatrix', () => {
  let component: PermissionMatrix;
  let fixture: ComponentFixture<PermissionMatrix>;

  /** Mirrors the real API: modules map different operation sets, so the grid renders their union
   *  while only the mapped pairs can be granted. */
  const modules: InstitutionModule[] = [
    {
      id: 3,
      parentModuleId: 0,
      parentModuleName: '',
      moduleName: 'StaffMember',
      isEnabled: true,
      operations: [
        { id: 1, operationName: 'Add', operationType: 1, isEnabled: true },
        { id: 4, operationName: 'View', operationType: 1, isEnabled: true },
      ],
    },
    {
      id: 61,
      parentModuleId: 0,
      parentModuleName: '',
      moduleName: 'Subscription-Plan',
      isEnabled: true,
      operations: [{ id: 1, operationName: 'Add', operationType: 1, isEnabled: true }],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionMatrix],
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionMatrix);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('modules with unequal operation sets', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('institutionModules', modules);
      fixture.detectChanges();
    });

    it('should render the union of operations as rows', () => {
      expect(component.allOperations()).toEqual(['Add', 'View']);
    });

    it('should only treat mapped pairs as applicable', () => {
      expect(component.isApplicable('Subscription-Plan', 'Add')).toBe(true);
      expect(component.isApplicable('Subscription-Plan', 'View')).toBe(false);
      expect(component.isApplicable('StaffMember', 'View')).toBe(true);
    });

    it('should leave empty a cell the module does not map', () => {
      expect(
        fixture.nativeElement.querySelectorAll('input[type="checkbox"][disabled]').length,
      ).toBe(0);
      expect(fixture.nativeElement.textContent).toContain(
        'View is not available for Subscription-Plan module',
      );
    });

    it('should collapse unlabelled operation types into one Other group', () => {
      fixture.componentRef.setInput('institutionModules', [
        {
          ...modules[0],
          operations: [
            { id: 1, operationName: 'Add', operationType: 1, isEnabled: true },
            { id: 9, operationName: 'Export', operationType: 11, isEnabled: true },
            { id: 10, operationName: 'Import', operationType: 12, isEnabled: true },
          ],
        },
      ]);
      fixture.detectChanges();

      expect(component.operationGroups().map((g) => g.label)).toEqual(['CRUD', 'Other']);
      expect(component.operationGroups()[1].operations.map((o) => o.name)).toEqual([
        'Export',
        'Import',
      ]);
    });

    it('should count a module against its own operations', () => {
      expect(component.moduleOperationTotals()).toEqual({ StaffMember: 2, 'Subscription-Plan': 1 });
    });

    it('toggleModule should not grant an unmapped operation', () => {
      component.toggleModule('Subscription-Plan');

      expect(component.permissionMap()['Subscription-Plan']).toEqual({ Add: true });
      expect(component.moduleAllState()['Subscription-Plan']).toBe('all');
      expect(component.modulePermCount()['Subscription-Plan']).toBe(1);
    });

    it('toggleOperation should skip modules without that operation', () => {
      component.toggleOperation('View');

      expect(component.permissionMap()['StaffMember']['View']).toBe(true);
      expect(component.permissionMap()['Subscription-Plan']['View']).toBeUndefined();
      expect(component.operationAllState()['View']).toBe('all');
    });

    it('toggleAll should reach the all state and emit only mapped pairs', () => {
      component.toggleAll();
      expect(component.globalAllState()).toBe('all');

      const emitted: unknown[] = [];
      component.savePermissions.subscribe((payload) => emitted.push(payload));
      component.onSave();

      expect(emitted).toEqual([
        {
          modules: [
            {
              moduleId: 3,
              moduleName: 'StaffMember',
              operations: [
                { operationId: 1, operationName: 'Add', operationType: 1, hasAccess: true },
                { operationId: 4, operationName: 'View', operationType: 1, hasAccess: true },
              ],
            },
            {
              moduleId: 61,
              moduleName: 'Subscription-Plan',
              operations: [
                { operationId: 1, operationName: 'Add', operationType: 1, hasAccess: true },
              ],
            },
          ],
        },
      ]);
    });
  });
});
