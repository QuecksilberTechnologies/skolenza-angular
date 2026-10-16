import { Pipe, PipeTransform } from '@angular/core';

import { INSTITUTION_LOCATION_TYPES } from '@shared/utilities/common-data';

@Pipe({
  name: 'getInstitutionLocationType',
})
export class GetInstitutionLocationTypePipe implements PipeTransform {
  transform(id: number | null | undefined): string {
    const locationType = INSTITUTION_LOCATION_TYPES.find((t) => t.id === id);
    return locationType?.label || '-';
  }
}
