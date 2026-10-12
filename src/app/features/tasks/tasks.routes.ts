import { Routes } from '@angular/router';

import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { roleTypeGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

// roleTypeId: 0=Host, 1=Admin, 2=StaffMember, 3=Manager
const adminManager = [
  roleTypeGuard([
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffManager,
  ]),
];

export const TASKS_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./tasks-dashboard/tasks-dashboard'),
    title: `Task Dashboard | ${titleSuffix}`,
  },
  {
    path: 'list',
    loadComponent: () => import('./tasks-list/tasks-list'),
    title: `All Tasks | ${titleSuffix}`,
    data: { scope: 'all' },
  },
  {
    path: 'my',
    loadComponent: () => import('./tasks-list/tasks-list'),
    title: `My Tasks | ${titleSuffix}`,
    data: { scope: 'my' },
  },
  {
    path: 'team',
    loadComponent: () => import('./tasks-list/tasks-list'),
    title: `Team Tasks | ${titleSuffix}`,
    data: { scope: 'team' },
    canActivate: adminManager,
  },
  {
    path: 'board',
    loadComponent: () => import('./tasks-kanban/tasks-kanban'),
    title: `Task Board | ${titleSuffix}`,
  },
  {
    path: 'calendar',
    loadComponent: () => import('./tasks-calendar/tasks-calendar'),
    title: `Task Calendar | ${titleSuffix}`,
  },
  {
    path: 'create',
    loadComponent: () => import('./task-form/task-form'),
    title: `Create Task | ${titleSuffix}`,
    data: { mode: 'create' },
    canActivate: adminManager,
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./task-form/task-form'),
    title: `Edit Task | ${titleSuffix}`,
    data: { mode: 'edit' },
    canActivate: adminManager,
  },
  {
    path: ':id',
    loadComponent: () => import('./task-detail/task-detail'),
    title: `Task Details | ${titleSuffix}`,
  },
];
