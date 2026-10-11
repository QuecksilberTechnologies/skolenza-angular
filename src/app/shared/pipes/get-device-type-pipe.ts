import { Pipe, PipeTransform } from '@angular/core';

import { DEVICE_TYPES } from '@shared/utilities/common-data';

@Pipe({
  name: 'getDeviceType',
})
export class GetDeviceTypePipe implements PipeTransform {
  transform(id: number): string {
    const deviceType = DEVICE_TYPES.find((d) => d.id === id);
    return deviceType?.label || '-';
  }
}
