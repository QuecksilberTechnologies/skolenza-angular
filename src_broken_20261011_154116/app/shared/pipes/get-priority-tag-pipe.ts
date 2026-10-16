import { Pipe, PipeTransform } from '@angular/core';

import { PriorityTag } from '@shared/interfaces';

@Pipe({
  name: 'getPriorityTag',
})
export class GetPriorityTagPipe implements PipeTransform {
  transform(priority: string): PriorityTag {
    switch (priority) {
      case 'high':
        return { value: 'High', colorKey: '#FFCDD2' }; // red-500
      case 'medium':
        return { value: 'Medium', colorKey: '#FFCCBC' }; // yellow-500
      case 'low':
        return { value: 'Low', colorKey: '#B3E5FC' }; // blue-500
      default:
        return { value: '', colorKey: '#F1F3F4' }; // gray-500 as 'secondary'
    }
  }
}
