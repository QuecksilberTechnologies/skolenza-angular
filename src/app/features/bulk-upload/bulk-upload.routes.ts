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
    loadComponent: () => import('./staff-members-bulk-upload'),
    title: title('Bulk Upload Staff Members'),
    data: { pageTitle: 'Bulk Upload Staff Members' },
  },
  {
    path: 'departments',
    loadComponent: () => import('./departments-bulk-upload'),
    title: title('Bulk Upload Departments'),
    data: { pageTitle: 'Bulk Upload Departments' },
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
    title: title('Bulk Upload Staff Employment Types'),
    data: { pageTitle: 'Bulk Upload Staff Employment Types' },
  },
];
