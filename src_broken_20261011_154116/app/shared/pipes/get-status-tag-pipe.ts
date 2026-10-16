import { Pipe, PipeTransform } from '@angular/core';

import { StatusTag } from '@shared/interfaces';

@Pipe({
  name: 'getStatusTag',
})
export class GetStatusTagPipe implements PipeTransform {
  transform(status: string): StatusTag {
    switch (status) {
      case 'todo':
        return { value: 'To Do', colorKey: '#D2E3FC' }; // gray-500
      case 'in-progress':
        return { value: 'In Progress', colorKey: '#FEEFC3' }; // blue-600
      case 'review':
        return { value: 'Review', colorKey: '#FAD2CF' }; // yellow-500
      case 'done':
        return { value: 'Done', colorKey: '#CEEAD6' }; // green-500
      default:
        return { value: '', colorKey: '#F1F3F4' }; // gray-500 as default
    }
  }
}
