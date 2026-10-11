import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RolesApi } from '@core/services';

import { ROLE_IMPORT_DISPLAY, roleBulkImportAdapter } from '../roles/role-bulk-import';
import { BulkImportJobs } from './bulk-import-jobs';

/** `INSTITUTION_ACCESS` from `GET /Navigation/my-menu`. */
@Component({
  selector: 'app-roles-bulk-upload',
  imports: [BulkImportJobs],
  template: `
    <app-bulk-import-jobs
      [adapter]="adapter"
      [display]="display"
      moduleCode="INSTITUTION_ACCESS"
      entityTitle="Roles"
      emptyIcon="pi pi-shield"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RolesBulkUpload {
  protected readonly adapter = roleBulkImportAdapter(inject(RolesApi));
  protected readonly display = ROLE_IMPORT_DISPLAY;
}
