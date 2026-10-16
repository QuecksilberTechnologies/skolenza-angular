import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';

import { CanComponentDeactivate } from '@core/guards';
import { Common } from '@core/services';
import {
  PermissionMatrix,
  PermissionSavePayload,
} from '@shared/components/permission-matrix/permission-matrix';
import { PermissionMatrixLoader } from '@shared/components/permission-matrix/permission-matrix-loader/permission-matrix-loader';

import { InstitutionModulesStore } from './institution-modules.store';

@Component({
  selector: 'app-institution-modules',
  imports: [CardModule, PermissionMatrix, PermissionMatrixLoader],
  providers: [InstitutionModulesStore],
  templateUrl: './institution-modules.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionModules implements CanComponentDeactivate {
  readonly store = inject(InstitutionModulesStore);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly permissionMatrix = viewChild(PermissionMatrix);

  /** The id is an opaque token, so it is read as-is rather than parsed. */
  protected readonly institutionId = this.#route.snapshot.paramMap.get('institutionId') ?? '';

  canDeactivate(): boolean {
    return !this.permissionMatrix()?.isDirty();
  }

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Institution Modules',
      pageDescription: 'Choose the modules and operations this institution can use',
      pageIcon: 'pi pi-th-large',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Institutions', routerLink: '/app/institutions' },
      { label: 'Modules & operations' },
    ]);

    this.store.loadModules(this.institutionId);
  }

  onSaveModules(payload: PermissionSavePayload): void {
    this.store.saveModules(this.institutionId, payload, () => {
      this.permissionMatrix()?.markAsPristine();
    });
  }
}
