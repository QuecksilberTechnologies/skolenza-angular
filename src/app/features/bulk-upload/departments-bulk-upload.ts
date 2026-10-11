import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DepartmentsApi } from '@core/services';

import {
  DEPARTMENT_IMPORT_DISPLAY,
  departmentBulkImportAdapter,
} from '../departments/department-bulk-import';
import { BulkImportJobs } from './bulk-import-jobs';

/** `INSTITUTION_DEPARTMENTS` from `GET /Navigation/my-menu`. */
@Component({
  selector: 'app-departments-bulk-upload',
  imports: [BulkImportJobs],
  template: `
    <app-bulk-import-jobs
      [adapter]="adapter"
      [display]="display"
      moduleCode="INSTITUTION_DEPARTMENTS"
      entityTitle="Departments"
      emptyIcon="pi pi-sitemap"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DepartmentsBulkUpload {
  protected readonly adapter = departmentBulkImportAdapter(inject(DepartmentsApi));
  protected readonly display = DEPARTMENT_IMPORT_DISPLAY;
}
