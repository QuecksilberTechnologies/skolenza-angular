import { Pipe, PipeTransform } from '@angular/core';

import { WORK_MODES } from '@shared/utilities/common-data';

@Pipe({
  name: 'getWorkMode',
})
export class GetWorkModePipe implements PipeTransform {
  transform(id: number | null | undefined): string {
    const workMode = WORK_MODES.find((w) => w.id === id);
    return workMode?.label || '-';
  }
}
