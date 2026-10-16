import { IModule, SubscriptionPlan } from '@shared/interfaces';

export type BillingPeriod = 'monthly' | 'yearly';

/** One bullet on a pricing card. `count` is the number of areas nested under a module group. */
export interface PlanFeature {
  key: string;
  label: string;
  count?: number;
}

/** A top-level module on a plan, with everything nested beneath it collapsed into a count. */
export interface PlanModuleGroup {
  key: string;
  /** Every backend module id merged into this group — kept so a merge stays traceable. */
  ids: number[];
  label: string;
  descendantCount: number;
}

/** Bullets shown before the card's "+N more" disclosure. */
export const FEATURE_PREVIEW_COUNT = 6;

/** `moduleName` is a kebab slug; used only when `displayName` is blank. */
function humanized(moduleName: string): string {
  const words = moduleName.replace(/[-_]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

function moduleLabel(module: IModule): string {
  return module.displayName?.trim() || humanized(module.moduleName ?? '') || 'Module';
}

/** Case/whitespace-insensitive key used both to merge sibling groups and to de-duplicate counts. */
function labelKey(label: string): string {
  return label.trim().toLowerCase();
}

/** Collects `modules` and every `childModules` descendant into one id-keyed map, first write wins. */
function flattenModules(modules: readonly IModule[], into: Map<number, IModule>): void {
  for (const module of modules) {
    if (!module || into.has(module.id)) continue;
    into.set(module.id, module);
    if (module.childModules?.length) flattenModules(module.childModules, into);
  }
}

/**
 * The API does not return a normalized forest: one plan sends true roots with nested
 * `childModules`, another sends branch nodes whose parent is absent, another bare leaves.
 * One rule covers all three — a node is top-level unless its parent is present in the plan.
 */
export function normalizePlanModules(
  modules: readonly IModule[] | null | undefined,
): PlanModuleGroup[] {
  if (!modules?.length) return [];

  const byId = new Map<number, IModule>();
  flattenModules(modules, byId);

  const isChild = (module: IModule): boolean =>
    !!module.parentModuleId &&
    module.parentModuleId !== module.id &&
    byId.has(module.parentModuleId);

  // parent id -> direct children, so descendants can be walked without re-scanning the map.
  const childrenOf = new Map<number, IModule[]>();
  for (const module of byId.values()) {
    if (!isChild(module)) continue;
    const siblings = childrenOf.get(module.parentModuleId as number) ?? [];
    siblings.push(module);
    childrenOf.set(module.parentModuleId as number, siblings);
  }

  const groups = new Map<string, PlanModuleGroup & { descendantKeys: Set<string> }>();

  for (const module of byId.values()) {
    if (isChild(module)) continue;

    const label = moduleLabel(module);
    const key = labelKey(label);

    // Descendant labels, not ids — the same label can repeat in a subtree and must count once.
    const descendantKeys = new Set<string>();
    const visited = new Set<number>([module.id]);
    const queue = [...(childrenOf.get(module.id) ?? [])];
    while (queue.length) {
      const node = queue.shift() as IModule;
      if (visited.has(node.id)) continue; // module trees are user-editable; do not trust acyclicity
      visited.add(node.id);
      descendantKeys.add(labelKey(moduleLabel(node)));
      queue.push(...(childrenOf.get(node.id) ?? []));
    }

    // Two top-level modules can share a display name ("Profile" arrives as id 6 and id 8);
    // rendering the same bullet twice reads as a bug, so merge them.
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(module.id);
      for (const descendant of descendantKeys) existing.descendantKeys.add(descendant);
      continue;
    }

    groups.set(key, { key, ids: [module.id], label, descendantCount: 0, descendantKeys });
  }

  return [...groups.values()]
    .map(({ key, ids, label, descendantKeys }) => ({
      key,
      ids,
      label,
      descendantCount: descendantKeys.size,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/** Picks the English form for `count`. The only two forms the page needs; no i18n layer here yet. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

/** The bullet list a pricing card renders. Day rate lives in the price block, not here. */
export function toPlanFeatures(plan: SubscriptionPlan): PlanFeature[] {
  const seats = plan.maxUsers || 0;

  return [
    // A plan with no seat count advertises nothing rather than "Up to 0 users".
    ...(seats ? [{ key: 'seats', label: `Up to ${seats} ${plural(seats, 'user')}` }] : []),
    { key: 'support', label: plan.isFree ? 'Free plan' : 'Premium support' },
    ...normalizePlanModules(plan.modules).map((group) => ({
      key: `module-${group.key}`,
      label: group.label,
      count: group.descendantCount || undefined,
    })),
  ];
}

/** Maps a raw plan to the display shape `PricingCard` expects for the selected period. */
export function toDisplayPlan(plan: SubscriptionPlan, period: BillingPeriod): SubscriptionPlan {
  return {
    ...plan,
    price: (period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) || 0,
    period: period === 'yearly' ? '/ year' : '/ month',
    features: toPlanFeatures(plan),
  };
}

/**
 * Free first, Custom last, rest ascending. Sorted on `monthlyPrice` rather than the resolved
 * `price` — tier is a property of the plan, so the order must not reshuffle when the period flips.
 */
export function orderPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => {
    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
    if (a.isCustom !== b.isCustom) return a.isCustom ? 1 : -1;
    return (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0) || (a.price ?? 0) - (b.price ?? 0);
  });
}

/** Percent saved by paying yearly, or `null` when yearly saves nothing (some plans cost more). */
export function yearlySavingPercent(plan: SubscriptionPlan): number | null {
  const monthlyTotal = (plan.monthlyPrice || 0) * 12;
  if (!monthlyTotal || !plan.yearlyPrice) return null;

  const percent = Math.round(((monthlyTotal - plan.yearlyPrice) / monthlyTotal) * 100);
  return percent > 0 ? percent : null;
}

/** Best saving across the set, or `null` when no plan is cheaper yearly — the badge then hides. */
export function maxYearlySavingPercent(plans: readonly SubscriptionPlan[]): number | null {
  const savings = plans
    .map(yearlySavingPercent)
    .filter((percent): percent is number => percent !== null);

  return savings.length ? Math.max(...savings) : null;
}

/** Custom plans are quoted, not self-serve — the CTA opens a pre-filled enquiry instead. */
export const SALES_EMAIL = 'support@skolenza.in';

export function salesEnquiryMailto(planName: string): string {
  const subject = encodeURIComponent(`Enquiry about the ${planName} plan`);
  return `mailto:${SALES_EMAIL}?subject=${subject}`;
}
