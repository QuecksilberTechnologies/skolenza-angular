import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';

import { CanComponentDeactivate } from '@core/guards';
import { Common } from '@core/services';
import {
  PermissionMatrix,
  PermissionSavePayload,
} from '@shared/components/permission-matrix/permission-matrix';
import { PermissionMatrixLoader } from '@shared/components/permission-matrix/permission-matrix-loader/permission-matrix-loader';
import { LoginInfo } from '@shared/interfaces';

import { StaffMembersPermissionsStore } from './staff-members-permissions.store';

@Component({
  selector: 'app-staff-members-permissions',
  imports: [CardModule, RouterModule, PermissionMatrix, PermissionMatrixLoader],
  providers: [StaffMembersPermissionsStore],
  templateUrl: './staff-members-permissions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMembersPermissions implements OnInit, CanComponentDeactivate {
  readonly store = inject(StaffMembersPermissionsStore);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly staffMemberId = signal<string>('');
  readonly permissionMatrix = viewChild(PermissionMatrix);
  protected loginInfo!: LoginInfo;

  canDeactivate(): boolean {
    return !this.permissionMatrix()?.isDirty();
  }

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'StaffMember Permissions',
      pageDescription: 'StaffMember Permissions',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: true,
    });

    effect(() => {
      const staffMember = this.store.staffMember();
      const formattedName = this.store.isLoadingStaffMember()
        ? 'Loading...'
        : `${staffMember?.firstName || '-'} ${staffMember?.lastName || '-'}`;

      this.#commonService.setBreadcrumbItems([
        { label: 'StaffMembers', routerLink: '/app/staff-members' },
        { label: `Manage staffMember permissions for ${formattedName}` },
      ]);
    });

    this.#route.params.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.staffMemberId.set(params['staffMemberId']);
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    const info = this.loginInfo?.user;
    // Returning silently would leave the matrix permanently blank with nothing to
    // explain it, so say so instead.
    if (!info) {
      this.#commonService.showMessage(
        'Your session could not be read. Sign in again to manage permissions.',
        'error',
      );
      return;
    }

    this.store.loadStaffMember(this.staffMemberId(), info.staffMemberId);
    this.store.loadPermissions(this.staffMemberId());
  }

  onSavePermissions(payload: PermissionSavePayload): void {
    this.store.savePermissions(this.staffMemberId(), payload, () => {
      this.permissionMatrix()?.markAsPristine();
    });
  }
}
