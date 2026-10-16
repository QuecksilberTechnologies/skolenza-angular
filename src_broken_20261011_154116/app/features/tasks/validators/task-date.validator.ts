/**
 * Pure date-order check for the task form.
 * Used inside the Signal Form `validate(p.dueDate, …)` rule.
 */
export function isDueBeforeStart(due: Date | null, start: Date | null): boolean {
  return !!start && !!due && due < start;
}
