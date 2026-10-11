import { inject, Pipe, PipeTransform } from '@angular/core';

import { RolesApi } from '@core/services/roles-api';
import { RoleType } from '@shared/interfaces';

@Pipe({
  name: 'getRoleType',
})
export class GetRoleTypePipe implements PipeTransform {
  readonly #rolesApi = inject(RolesApi);

  transform(roleTypeId: number): RoleType | undefined {
    const roleTypes = this.#rolesApi.roleTypes();
    return roleTypes.find((rt) => rt?.id === roleTypeId);
  }
}
