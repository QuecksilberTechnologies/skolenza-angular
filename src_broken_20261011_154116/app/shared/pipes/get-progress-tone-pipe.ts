import { Pipe, PipeTransform } from '@angular/core';

import { progressTone, ProgressTone } from '@shared/utilities/progress-tone';

/** Exposes {@link progressTone} to templates - the stroke hex plus its text and bar classes. */
@Pipe({
  name: 'getProgressTone',
})
export class GetProgressTonePipe implements PipeTransform {
  transform(completionPercentage: number): ProgressTone {
    return progressTone(completionPercentage);
  }
}
