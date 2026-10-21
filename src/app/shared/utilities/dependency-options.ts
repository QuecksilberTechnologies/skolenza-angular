export type DependencyOption<T> = T & { disabled: boolean };

/**
 * Active records plus any inactive record that is already selected. The inactive ones stay
 * visible but disabled, so editing keeps a saved link without offering it for new selections.
 */
export function buildDependencyOptions<T extends { id: number; isActive: boolean }>(
  values: T[],
  selectedIds: ReadonlySet<number>,
): DependencyOption<T>[] {
  return values
    .filter((item) => item.isActive || selectedIds.has(item.id))
    .map((item) => ({ ...item, disabled: !item.isActive }));
}
