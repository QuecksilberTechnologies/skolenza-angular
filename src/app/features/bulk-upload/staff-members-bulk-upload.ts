import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { Common, StaffMembersApi } from '@core/services';
import { LoginInfo } from '@shared/interfaces';

import {
  staffMemberBulkImportAdapter,
  staffMemberImportDisplay,
} from '../staff-members/staff-member-bulk-import';
import { staffMemberImportFields } from '../staff-members/staff-member-import-fields';
import { BulkImportJobs } from './bulk-import-jobs';

/** Uses the Import operation granted on `STAFF_DIRECTORY` by `GET /Navigation/my-menu`. */
@Component({
  selector: 'app-staff-members-bulk-upload',
  imports: [BulkImportJobs],
  template: `
    <app-bulk-import-jobs
      [adapter]="adapter"
      [display]="display"
      moduleCode="STAFF_DIRECTORY"
      entityTitle="Staff Members"
      emptyIcon="pi pi-users"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMembersBulkUpload {
  readonly #commonService = inject(Common);
  readonly #loginInfo = signal<LoginInfo | null>(null);

  protected readonly adapter = staffMemberBulkImportAdapter(inject(StaffMembersApi));

  /**
   * The fix editor's lookups need an injection context and read the signed-in staff-member id at fetch
   * time, which is why the id is passed as a getter rather than by value - the login info resolves
   * a tick after construction.
   */
  protected readonly display = staffMemberImportDisplay(
    staffMemberImportFields(() => this.#loginInfo()?.user?.staffMemberId ?? ''),
  );

  constructor() {
    void this.#loadLoginInfo();
  }

  async #loadLoginInfo(): Promise<void> {
    this.#loginInfo.set(await this.#commonService.getLoginInfo());
  }
}
