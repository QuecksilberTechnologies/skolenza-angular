import { Pipe, PipeTransform } from '@angular/core';

import { progressTone } from '@shared/utilities/progress-tone';

/** The stroke hex alone. Use `getProgressTone` where the band also needs text or bar classes. */
@Pipe({
  name: 'getStaffMemberProgressColor',
})
export class GetStaffMemberProgressColorPipe implements PipeTransform {
  transform(completionPercentage: number): string {
    return progressTone(completionPercentage).stroke;
  }
}
