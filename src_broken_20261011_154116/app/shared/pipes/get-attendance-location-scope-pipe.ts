import { Pipe, PipeTransform } from '@angular/core';

import { ATTENDANCE_LOCATION_SCOPES } from '@shared/utilities/common-data';

@Pipe({
  name: 'getAttendanceLocationScope',
})
export class GetAttendanceLocationScopePipe implements PipeTransform {
  transform(id: number | null | undefined): string {
    const scope = ATTENDANCE_LOCATION_SCOPES.find((s) => s.id === id);
    return scope?.label || '-';
  }
}
