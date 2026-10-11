import { Pipe, PipeTransform } from '@angular/core';

import { DEVICE_COMMUNICATION_TYPES } from '@shared/utilities/common-data';

@Pipe({
  name: 'getDeviceCommunicationType',
})
export class GetDeviceCommunicationTypePipe implements PipeTransform {
  transform(id: number): string {
    const communicationType = DEVICE_COMMUNICATION_TYPES.find((c) => c.id === id);
    return communicationType?.label || '-';
  }
}
