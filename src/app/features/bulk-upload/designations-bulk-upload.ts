import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DesignationsApi } from '@core/services';

import {
  DESIGNATION_IMPORT_DISPLAY,
  designationBulkImportAdapter,
} from '../designations/designation-bulk-import';
import { BulkImportJobs } from './bulk-import-jobs';

/** `INSTITUTION_STAFF_DESIGNATIONS` from `GET /Navigation/my-menu`. */
@Component({
  selector: 'app-designations-bulk-upload',
  imports: [BulkImportJobs],
  template: `
    <app-bulk-import-jobs
      [adapter]="adapter"
      [display]="display"
      moduleCode="INSTITUTION_STAFF_DESIGNATIONS"
      entityTitle="Designations"
      emptyIcon="pi pi-id-card"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DesignationsBulkUpload {
  protected readonly adapter = designationBulkImportAdapter(inject(DesignationsApi));
  protected readonly display = DESIGNATION_IMPORT_DISPLAY;
}
