import { Pipe, PipeTransform } from '@angular/core';

import { CAMPUS_TYPES } from '@shared/utilities/common-data';

@Pipe({
  name: 'getCampusType',
})
export class GetCampusTypePipe implements PipeTransform {
  transform(id: number | null | undefined): string {
    const locationType = CAMPUS_TYPES.find((t) => t.id === id);
    return locationType?.label || '-';
  }
}
