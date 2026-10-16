import { TreeNode } from '@openng/optimus-ui/api';

import { PlanModuleOption } from '@shared/interfaces';

/** `TreeNode.key` is a string and the save payload needs numbers, so `data` carries the module id. */
export type ModuleTreeNode = TreeNode<number>;

const labelOf = (module: PlanModuleOption): string => module.displayName || module.moduleName;

/** Root modules read heavier than their children — the tree has no other hierarchy cue. */
function nodeClassOf(module: PlanModuleOption, depth: number): string | undefined {
  const classes = [
    ...(depth === 0 ? ['font-medium'] : []),
    ...(module.isActive ? [] : ['opacity-60']),
  ];
  return classes.length ? classes.join(' ') : undefined;
}

/**
 * Builds the `p-tree` value. `parent` is deliberately left unset — the tree wires it itself, and
 * setting it here would make the node graph cyclic.
 */
export function toModuleTreeNodes(modules: PlanModuleOption[], depth = 0): ModuleTreeNode[] {
  const labelCounts = new Map<string, number>();
  for (const module of modules) {
    const label = labelOf(module);
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  return modules.map((module) => {
    const label = labelOf(module);
    // Siblings really do collide — two children of "Attendance management" are both
    // "Mark Attendance" — and a duplicated accessible name is unusable in a tree.
    const isAmbiguous = (labelCounts.get(label) ?? 0) > 1;

    return {
      key: String(module.moduleId),
      data: module.moduleId,
      label: isAmbiguous ? `${label} (${module.moduleName})` : label,
      children: toModuleTreeNodes(module.children, depth + 1),
      leaf: module.children.length === 0,
      // The popup opens fully expanded.
      expanded: true,
      styleClass: nodeClassOf(module, depth),
    } satisfies ModuleTreeNode;
  });
}

/**
 * A copy of the tree with every branch expanded or collapsed. `p-tree` and its node component are
 * both `OnPush` and take the node as an input, so mutating `expanded` in place never redraws —
 * only a fresh node object does.
 */
export function withExpanded(nodes: ModuleTreeNode[], expanded: boolean): ModuleTreeNode[] {
  return nodes.map((node) => {
    const children = node.children ?? [];
    return {
      ...node,
      children: withExpanded(children, expanded),
      expanded: children.length ? expanded : node.expanded,
    };
  });
}

/** A copy of the tree with every indeterminate mark dropped. Fresh nodes for the same reason. */
export function withoutPartialSelection(nodes: ModuleTreeNode[]): ModuleTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    children: withoutPartialSelection(node.children ?? []),
    partialSelected: false,
  }));
}

/** Every node of the tree, in pre-order — what the bulk actions operate on. */
export function flattenNodes(nodes: ModuleTreeNode[]): ModuleTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
}

/** Every already-mapped id, at any depth. Faithful to the response — a mapped parent does not
 *  imply mapped children, so nothing is inferred here. */
export function collectMappedIds(modules: PlanModuleOption[]): number[] {
  return modules.flatMap((module) => [
    ...(module.isMapped ? [module.moduleId] : []),
    ...collectMappedIds(module.children),
  ]);
}

/**
 * Seeds the indeterminate flags. `p-tree` derives `partialSelected` in `propagateUp`, which only
 * runs on user interaction — the selection handed to it on load leaves every flag false.
 *
 * A branch is partial whenever its subtree carries any mapping without the branch being wholly
 * mapped — the branch mapped while its children are not (module 27 arrives that way), and equally
 * the branch unmapped while its children are. `p-tree` keeps neither in `selection`, so without
 * this an unmapped parent would render as an empty box above ticked children.
 */
export function markPartialSelection(
  nodes: ModuleTreeNode[],
  mappedIds: ReadonlySet<number>,
): void {
  for (const node of nodes) {
    const children = node.children ?? [];
    markPartialSelection(children, mappedIds);

    if (!children.length) {
      node.partialSelected = false;
      continue;
    }

    const selected = children.filter(
      (child) => mappedIds.has(child.data as number) && !child.partialSelected,
    ).length;
    const anyPartialChild = children.some((child) => child.partialSelected);
    const isMapped = mappedIds.has(node.data as number);

    node.partialSelected =
      (isMapped || anyPartialChild || selected > 0) && !(isMapped && selected === children.length);
  }
}

/**
 * The save payload: everything the tree has checked, plus the mapped branches it cannot hold.
 * `propagateUp` drops a partially selected parent out of `selection`, so a `selection`-only read
 * would unmap the parent-mapped-with-unmapped-children rows the API itself returns.
 *
 * `preservedIds` is deliberately not derived from `partialSelected`: a branch is also indeterminate
 * when a descendant is mapped and the branch itself is not, and posting those would map ancestors
 * the API never returned as mapped.
 */
export function selectedModuleIds(
  selection: ModuleTreeNode[],
  preservedIds: ReadonlySet<number>,
): number[] {
  const ids = new Set<number>(preservedIds);
  for (const node of selection) {
    ids.add(node.data as number);
  }

  return [...ids].sort((a, b) => a - b);
}

/** Every id under `moduleId`, itself included — empty when the id is not in `nodes`. */
export function subtreeIds(nodes: ModuleTreeNode[], moduleId: number): number[] {
  for (const node of nodes) {
    if (node.data === moduleId) {
      return flattenNodes([node]).map((descendant) => descendant.data as number);
    }

    const found = subtreeIds(node.children ?? [], moduleId);
    if (found.length) {
      return found;
    }
  }

  return [];
}

/** The nodes matching `ids`, flattened — the shape `p-tree` wants for its `selection` model. */
export function nodesForIds(nodes: ModuleTreeNode[], ids: ReadonlySet<number>): ModuleTreeNode[] {
  return nodes.flatMap((node) => [
    ...(ids.has(node.data as number) ? [node] : []),
    ...nodesForIds(node.children ?? [], ids),
  ]);
}
