import { AbstractControl, ValidationErrors } from '@angular/forms';

export function dateRangeValidator(
  startKey: string,
  endKey: string,
): (group: AbstractControl) => ValidationErrors | null {
  return (group: AbstractControl) => {
    const start = group.get(startKey)?.value;
    const end = group.get(endKey)?.value;
    if (!start || !end) return null;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (isNaN(startMs) || isNaN(endMs)) return null;
    return endMs < startMs ? { dateRange: true } : null;
  };
}
