import { inject, Pipe, PipeTransform } from '@angular/core';

import { StaffMemberEducationAPI } from '@core/services/staff-member-education-api';
import { ScoreType } from '@shared/interfaces';

@Pipe({
  name: 'getScoreType',
})
export class GetScoreTypePipe implements PipeTransform {
  readonly #staffMemberEducationAPI = inject(StaffMemberEducationAPI);

  transform(id?: string): ScoreType | undefined {
    const scoreTypes = this.#staffMemberEducationAPI.scoreTypes();
    return scoreTypes.find((x) => x?.value === id);
  }
}
