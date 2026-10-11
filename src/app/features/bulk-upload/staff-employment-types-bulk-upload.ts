import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { StaffEmploymentTypesAPI } from '@core/services';

import {
  STAFF_EMPLOYMENT_TYPES_IMPORT_DISPLAY,
  staffEmploymentTypeBulkImportAdapter,
} from '../staff-employment-types/staff-employment-type-bulk-import';
import { BulkImportJobs } from './bulk-import-jobs';

/** Uses the Import operation granted on `STAFF_EMPLOYMENT_TYPES` by `GET /Navigation/my-menu`. */
@Component({
  selector: 'app-staff-employment-types-bulk-upload',
  imports: [BulkImportJobs],
  template: `
    <app-bulk-import-jobs
      [adapter]="adapter"
      [display]="display"
      moduleCode="STAFF_EMPLOYMENT_TYPES"
      entityTitle="Staff Employment Types"
      emptyIcon="pi pi-tags"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffEmploymentTypesBulkUpload {
  protected readonly adapter = staffEmploymentTypeBulkImportAdapter(inject(StaffEmploymentTypesAPI));
  protected readonly display = STAFF_EMPLOYMENT_TYPES_IMPORT_DISPLAY;
}


