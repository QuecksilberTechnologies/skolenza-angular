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

import { RolePermissionsStore } from './role-permissions.store';

@Component({
  selector: 'app-role-permissions',
  imports: [CardModule, RouterModule, PermissionMatrix, PermissionMatrixLoader],
  providers: [RolePermissionsStore],
  templateUrl: './role-permissions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RolePermissions implements OnInit, CanComponentDeactivate {
  readonly store = inject(RolePermissionsStore);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly roleId = signal<number>(0);
  readonly permissionMatrix = viewChild(PermissionMatrix);

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Role Permissions',
      pageDescription: 'Role Permissions',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: true,
    });

    effect(() => {
      const roleName = this.store.isLoadingRole()
        ? 'Loading...'
        : `${this.store.role()?.roleName || '-'}`;
      this.#commonService.setBreadcrumbItems([
        { label: 'Roles', routerLink: '/app/roles' },
        { label: `Manage role permissions for ${roleName}` },
      ]);
    });

    this.#route.params.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.roleId.set(+params['roleId']);
    });
  }

  canDeactivate(): boolean {
    return !this.permissionMatrix()?.isDirty();
  }

  async ngOnInit() {
    const loginInfo = await this.#commonService.getLoginInfo();

    const info = loginInfo?.user;
    // Returning silently would leave the matrix permanently blank with nothing to
    // explain it, so say so instead.
    if (!info) {
      this.#commonService.showMessage(
        'Your session could not be read. Sign in again to manage permissions.',
        'error',
      );
      return;
    }

    this.store.loadRole(this.roleId(), info.staffMemberId);
    this.store.loadPermissions(this.roleId());
  }

  onSavePermissions(payload: PermissionSavePayload): void {
    this.store.savePermissions(this.roleId(), payload, () => {
      this.permissionMatrix()?.markAsPristine();
    });
  }
}
