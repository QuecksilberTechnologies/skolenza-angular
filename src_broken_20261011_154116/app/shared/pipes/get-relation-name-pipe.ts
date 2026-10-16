import { Pipe, PipeTransform } from '@angular/core';

import { Relation } from '@shared/interfaces';

@Pipe({
  name: 'getRelationName',
})
export class GetRelationNamePipe implements PipeTransform {
  transform(id: number | null | undefined, relations: readonly Relation[]): string {
    const relation = relations.find((r) => r.id === id);
    return relation?.label || '-';
  }
}
