import { Routes } from '@angular/router';

import { environment } from '@env/environment';

/**
 * The `BULKUPLOAD` subtree from `GET /Navigation/my-menu`, one screen per child.
 *
 * The parent node carries a `urlPath` of its own but `isLeafNode: false`, so it is a menu group
 * here and has no route - the same reading the sidebar makes of `STAFF_MGMT` and `INSTITUTION_MGMT`.
 *
 * Each child publishes only `Import` and `View`, which is what these screens gate on: `View` for
 * the job table itself, `Import` for the wizard, retry and cancel.
 */
const title = (pageTitle: string) => `${pageTitle} | ${environment.appName}`;

export const BULK_UPLOAD_ROUTES: Routes = [
  {
    path: 'staffMembers',
    loadComponent: () => import('./staffMembers-bulk-upload'),
    title: title('Bulk Upload StaffMembers'),
    data: { pageTitle: 'Bulk Upload StaffMembers' },
  },
  {
    path: 'departments',
    loadComponent: () => import('./departments-bulk-upload'),
    title: title('Bulk Upload Departments'),
    data: { pageTitle: 'Bulk Upload Departments' },
  },
  {
    path: 'designations',
    loadComponent: () => import('./designations-bulk-upload'),
    title: title('Bulk Upload Designations'),
    data: { pageTitle: 'Bulk Upload Designations' },
  },
  {
    path: 'roles',
    loadComponent: () => import('./roles-bulk-upload'),
    title: title('Bulk Upload Roles'),
    data: { pageTitle: 'Bulk Upload Roles' },
  },
  {
    path: 'staff-employment-types',
    loadComponent: () => import('./staff-employment-types-bulk-upload'),
    title: title('Bulk Upload StaffMember Types'),
    data: { pageTitle: 'Bulk Upload StaffMember Types' },
  },
];

