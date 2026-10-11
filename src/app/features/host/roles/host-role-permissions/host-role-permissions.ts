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
import { ActivatedRoute } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';

import { CanComponentDeactivate } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import {
  PermissionMatrix,
  PermissionSavePayload,
} from '@shared/components/permission-matrix/permission-matrix';
import { PermissionMatrixLoader } from '@shared/components/permission-matrix/permission-matrix-loader/permission-matrix-loader';

import { HostRolePermissionsStore } from './host-role-permissions.store';

@Component({
  selector: 'app-host-role-permissions',
  imports: [CardModule, PermissionMatrix, PermissionMatrixLoader],
  providers: [HostRolePermissionsStore],
  templateUrl: './host-role-permissions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HostRolePermissions implements OnInit, CanComponentDeactivate {
  readonly store = inject(HostRolePermissionsStore);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly hostRoleId = signal<number>(0);
  readonly permissionMatrix = viewChild(PermissionMatrix);

  canDeactivate(): boolean {
    return !this.permissionMatrix()?.isDirty();
  }

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
        : `${this.store.hostRole()?.name || '-'}`;
      this.#commonService.setBreadcrumbItems([
        { label: 'Platform Roles', routerLink: '/app/platform-roles' },
        { label: `Manage role permissions for ${roleName}` },
      ]);
    });

    this.#route.params.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.hostRoleId.set(+params['hostRoleId']);
    });
  }

  ngOnInit() {
    this.store.loadHostRole(this.hostRoleId());
    this.store.loadPermissions(this.hostRoleId());
  }

  onSavePermissions(payload: PermissionSavePayload): void {
    // Defence in depth behind the route guard — never write without the operation.
    if (!this.#permissionsStore.canPerform(HOST_MODULE.hostRole, 'Update')) {
      this.#commonService.showMessage('You do not have permission to update host roles', 'error');
      return;
    }

    this.store.savePermissions(this.hostRoleId(), payload, () => {
      this.permissionMatrix()?.markAsPristine();
    });
  }
}
