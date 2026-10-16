import { PlanModuleOption } from '@shared/interfaces';

import {
  collectMappedIds,
  flattenNodes,
  markPartialSelection,
  ModuleTreeNode,
  nodesForIds,
  selectedModuleIds,
  subtreeIds,
  toModuleTreeNodes,
} from './subscription-plan-module-map.model';

const node = (
  moduleId: number,
  moduleName: string,
  displayName: string,
  overrides: Partial<PlanModuleOption> = {},
): PlanModuleOption => ({
  moduleId,
  moduleName,
  displayName,
  isMapped: false,
  isActive: true,
  children: [],
  ...overrides,
});

/** Mirrors the real payload: three levels deep, a mapped parent whose children are not. */
const modules: PlanModuleOption[] = [
  node(27, 'Asset-Management', 'Asset management', {
    isMapped: true,
    children: [node(28, 'Asset-Create', 'Asset creation'), node(30, 'Asset-Type-Master', '')],
  }),
  node(5, 'Common', 'Basic menu', {
    children: [
      node(7, 'Notifications', 'Notifications', {
        children: [node(12, 'Message', 'Message'), node(13, 'Notification', 'Notification')],
      }),
    ],
  }),
];

const find = (nodes: ModuleTreeNode[], moduleId: number): ModuleTreeNode =>
  nodesForIds(nodes, new Set([moduleId]))[0];

describe('subscription-plan-module-map.model', () => {
  describe('toModuleTreeNodes', () => {
    it('should carry the numeric module id on data and the string form on key', () => {
      const [asset] = toModuleTreeNodes(modules);

      expect(asset.data).toBe(27);
      expect(asset.key).toBe('27');
      expect(asset.children?.map((child) => child.data)).toEqual([28, 30]);
    });

    it('should open every branch expanded and flag the leaves', () => {
      const nodes = toModuleTreeNodes(modules);

      expect(nodes.every((n) => n.expanded)).toBe(true);
      expect(find(nodes, 12).leaf).toBe(true);
      expect(find(nodes, 7).leaf).toBe(false);
    });

    it('should fall back to the module name when there is no display name', () => {
      expect(find(toModuleTreeNodes(modules), 30).label).toBe('Asset-Type-Master');
    });

    it('should keep the label unique when siblings share a display name', () => {
      const nodes = toModuleTreeNodes([
        node(39, 'Attendande-Management', 'Attendance management', {
          children: [
            node(40, 'Attendande', 'Mark Attendance'),
            node(42, 'Mob-Mark', 'Mark Attendance'),
          ],
        }),
      ]);

      expect(nodes[0].children?.map((child) => child.label)).toEqual([
        'Mark Attendance (Attendande)',
        'Mark Attendance (Mob-Mark)',
      ]);
    });

    it('should weight root modules above their children', () => {
      const nodes = toModuleTreeNodes(modules);

      expect(nodes[0].styleClass).toBe('font-medium');
      expect(nodes[0].children?.[0].styleClass).toBeUndefined();
    });

    it('should dim an inactive module rather than hide it, keeping the root weight', () => {
      const nodes = toModuleTreeNodes([
        node(9, 'Retired', 'Retired', {
          isActive: false,
          children: [node(10, 'Retired-Child', 'Retired child', { isActive: false })],
        }),
      ]);

      expect(nodes[0].styleClass).toBe('font-medium opacity-60');
      expect(nodes[0].children?.[0].styleClass).toBe('opacity-60');
    });
  });

  describe('collectMappedIds', () => {
    it('should collect mapped ids at every depth without inferring children from a parent', () => {
      const nested = [
        node(5, 'Common', 'Basic menu', {
          children: [node(7, 'Notifications', 'Notifications', { isMapped: true })],
        }),
        ...modules.slice(0, 1),
      ];

      expect(collectMappedIds(nested)).toEqual([7, 27]);
    });
  });

  describe('markPartialSelection', () => {
    it('should flag a branch that is mapped while its children are not', () => {
      const nodes = toModuleTreeNodes(modules);
      markPartialSelection(nodes, new Set([27]));

      expect(find(nodes, 27).partialSelected).toBe(true);
    });

    it('should leave a fully mapped branch solid', () => {
      const nodes = toModuleTreeNodes(modules);
      markPartialSelection(nodes, new Set([27, 28, 30]));

      expect(find(nodes, 27).partialSelected).toBe(false);
    });

    it('should carry a partial grandchild all the way up', () => {
      const nodes = toModuleTreeNodes(modules);
      markPartialSelection(nodes, new Set([12]));

      expect(find(nodes, 7).partialSelected).toBe(true);
      expect(find(nodes, 5).partialSelected).toBe(true);
    });

    it('should flag a branch whose children are all mapped while it is not', () => {
      const nodes = toModuleTreeNodes(modules);
      markPartialSelection(nodes, new Set([28, 30]));

      // `p-tree` would never leave such a parent empty, and it is not mapped, so indeterminate.
      expect(find(nodes, 27).partialSelected).toBe(true);
    });

    it('should never flag a leaf', () => {
      const nodes = toModuleTreeNodes(modules);
      markPartialSelection(nodes, new Set([12]));

      expect(find(nodes, 12).partialSelected).toBe(false);
    });
  });

  describe('selectedModuleIds', () => {
    it('should restore the mapped branch the tree drops from its selection', () => {
      // What `p-tree` would hold: the partial parent is not in it.
      expect(selectedModuleIds([], new Set([27]))).toEqual([27]);
    });

    it('should union the checked nodes with the preserved ones, sorted and deduplicated', () => {
      const nodes = toModuleTreeNodes(modules);

      expect(selectedModuleIds([find(nodes, 30), find(nodes, 30)], new Set([27, 30]))).toEqual([
        27, 30,
      ]);
    });

    it('should never map an ancestor that is only indeterminate because a descendant is', () => {
      const nodes = toModuleTreeNodes(modules);
      markPartialSelection(nodes, new Set([12]));

      // 5 and 7 both render indeterminate, but the API returned neither as mapped.
      expect(selectedModuleIds([find(nodes, 12)], new Set([12]))).toEqual([12]);
    });

    it('should be empty when nothing is selected', () => {
      expect(selectedModuleIds([], new Set())).toEqual([]);
    });
  });

  describe('subtreeIds', () => {
    it('should return the branch and every descendant', () => {
      expect(subtreeIds(toModuleTreeNodes(modules), 5)).toEqual([5, 7, 12, 13]);
    });

    it('should return the leaf alone', () => {
      expect(subtreeIds(toModuleTreeNodes(modules), 12)).toEqual([12]);
    });

    it('should be empty for an id outside the tree', () => {
      expect(subtreeIds(toModuleTreeNodes(modules), 999)).toEqual([]);
    });
  });

  describe('flattenNodes', () => {
    it('should return every node in pre-order', () => {
      expect(flattenNodes(toModuleTreeNodes(modules)).map((n) => n.data)).toEqual([
        27, 28, 30, 5, 7, 12, 13,
      ]);
    });
  });

  describe('nodesForIds', () => {
    it('should find nodes at any depth', () => {
      const nodes = toModuleTreeNodes(modules);

      expect(nodesForIds(nodes, new Set([27, 13])).map((n) => n.data)).toEqual([27, 13]);
    });
  });
});
