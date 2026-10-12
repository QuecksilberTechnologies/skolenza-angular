import { Routes } from '@angular/router';

import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { hasModulePermissionGuard, roleTypeGuard } from '@core/guards';

// Admin(1) / Manager(3) only. StaffMembers reach payroll solely via 'payslips'.
const adminGuards = [
  roleTypeGuard([
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffManager,
  ]),
  hasModulePermissionGuard('Payroll'),
];

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./payroll'),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () => import('./payroll-overview/payroll-overview'),
        canActivate: adminGuards,
        title: 'Payroll Overview',
      },
      {
        path: 'salary-structure',
        loadComponent: () =>
          import('./payroll-salary-structure/payroll-salary-structure'),
        canActivate: adminGuards,
        title: 'Salary Structure',
      },
      {
        path: 'payslips',
        loadComponent: () => import('./payroll-payslips/payroll-payslips'),
        title: 'Payslips',
      },
      {
        path: 'tax-settings',
        loadComponent: () =>
          import('./payroll-tax-settings/payroll-tax-settings'),
        canActivate: adminGuards,
        title: 'Tax Settings',
      },
    ],
  },
];
