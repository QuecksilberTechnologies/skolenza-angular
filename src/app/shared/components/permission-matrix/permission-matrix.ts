import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { map } from 'rxjs';

import { IndeterminateCheckbox } from '@shared/directives';
import { RolePermissionEntry, InstitutionModule, InstitutionOperation } from '@shared/interfaces';
import { normalisePermissionName } from '@shared/utilities/permission-name';

type AllState = 'all' | 'some' | 'none';

interface OperationDisplay {
  id: number;
  name: string;
  icon: string;
  iconClass: string;
}

interface OperationGroup {
  label: string;
  operations: OperationDisplay[];
}

export interface PermissionSavePayload {
  modules: {
    moduleId: number;
    moduleName: string;
    operations: {
      operationId: number;
      operationName: string;
      operationType: number;
      hasAccess: boolean;
    }[];
  }[];
}

const OPERATION_TYPE_LABELS: Record<number, string> = {
  1: 'CRUD',
  2: 'Workflow',
  3: 'Status',
  4: 'Actions',
};

/**
 * Display-only glyph per operation name, keyed by `normalisePermissionName()`.
 *
 * Not an enum and not exhaustive by contract: the backend owns this vocabulary and hands it over at
 * runtime through `getInstitutionOperations()`, so a name that is not here falls back to `DEFAULT_ICON`
 * rather than breaking the column. Keys are normalised because the API is not consistent about the
 * spelling it sends - `Inactive` and `InActive` are the same operation, and `Allow Editing` carries
 * a space.
 *
 * The names below are every operation `GET /Navigation/my-menu` currently publishes across the
 * institution and host trees.
 */
const OPERATION_ICONS: Record<string, { icon: string; iconClass: string }> = {
  add: { icon: 'pi pi-plus-circle', iconClass: 'text-green-600 dark:text-green-400' },
  // A second id for the same intent as `Add` on several modules, so it takes the same glyph.
  create: { icon: 'pi pi-plus-circle', iconClass: 'text-green-600 dark:text-green-400' },
  update: { icon: 'pi pi-pencil', iconClass: 'text-blue-600 dark:text-blue-400' },
  delete: { icon: 'pi pi-trash', iconClass: 'text-red-600 dark:text-red-400' },
  view: { icon: 'pi pi-eye', iconClass: 'text-zinc-600 dark:text-zinc-400' },
  approve: { icon: 'pi pi-check-circle', iconClass: 'text-green-600 dark:text-green-400' },
  reject: { icon: 'pi pi-times-circle', iconClass: 'text-red-600 dark:text-red-400' },
  active: { icon: 'pi pi-circle-fill', iconClass: 'text-green-500 dark:text-green-400' },
  inactive: { icon: 'pi pi-circle', iconClass: 'text-zinc-400 dark:text-zinc-500' },
  hold: { icon: 'pi pi-pause-circle', iconClass: 'text-amber-600 dark:text-amber-400' },
  apply: { icon: 'pi pi-send', iconClass: 'text-primary-600 dark:text-primary-400' },
  assign: { icon: 'pi pi-user-plus', iconClass: 'text-green-600 dark:text-green-400' },
  remove: { icon: 'pi pi-user-minus', iconClass: 'text-red-600 dark:text-red-400' },
  import: { icon: 'pi pi-cloud-upload', iconClass: 'text-blue-600 dark:text-blue-400' },
  export: { icon: 'pi pi-download', iconClass: 'text-blue-600 dark:text-blue-400' },
  upload: { icon: 'pi pi-upload', iconClass: 'text-blue-600 dark:text-blue-400' },
  download: { icon: 'pi pi-download', iconClass: 'text-zinc-600 dark:text-zinc-400' },
  verify: { icon: 'pi pi-verified', iconClass: 'text-green-600 dark:text-green-400' },
  'allow editing': { icon: 'pi pi-file-edit', iconClass: 'text-amber-600 dark:text-amber-400' },
  'resend credentials': { icon: 'pi pi-envelope', iconClass: 'text-blue-600 dark:text-blue-400' },
  'reset password': { icon: 'pi pi-key', iconClass: 'text-amber-600 dark:text-amber-400' },
};

const DEFAULT_ICON = { icon: 'pi pi-cog', iconClass: 'text-zinc-500 dark:text-zinc-400' };

@Component({
  selector: 'app-permission-matrix',
  imports: [
    FormsModule,
    CheckboxModule,
    ButtonModule,
    IndeterminateCheckbox,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
  ],
  templateUrl: './permission-matrix.html',
  styleUrl: './permission-matrix.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionMatrix {
  /** Institution modules with their operations — builds the full matrix structure. */
  readonly institutionModules = input<InstitutionModule[]>([]);

  /** Flat role/staffMember permission rows used to pre-select checkboxes.
   *  Matched against the matrix by `moduleId` + `operationId`. */
  readonly rolePermissions = input<RolePermissionEntry[]>([]);

  /** Keeps the save button busy while the page persists the emitted payload. */
  readonly isSaving = input(false);

  readonly savePermissions = output<PermissionSavePayload>();

  readonly #breakpointObserver = inject(BreakpointObserver);
  readonly isMobile = toSignal(
    this.#breakpointObserver.observe('(max-width: 767px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly expandedModule = signal<string | null>(null);

  /** Module names derived from API data */
  readonly modules = computed(() =>
    this.institutionModules()
      .filter((m) => m.isEnabled)
      .map((m) => m.moduleName),
  );

  readonly moduleFilter = signal('');
  readonly #normalizedQuery = computed(() => this.moduleFilter().trim().toLowerCase());
  readonly filteredModules = computed(() => {
    const query = this.#normalizedQuery();
    if (!query) return this.modules();
    const matches = this.modules().filter((m) => m.toLowerCase().includes(query));
    return matches.length > 0 ? matches : this.modules();
  });

  /** Operation groups derived from API data, grouped by operationType */
  readonly operationGroups = computed<OperationGroup[]>(() => {
    const modules = this.institutionModules().filter((m) => m.isEnabled);
    if (modules.length === 0) return [];

    // Collect unique operations across all modules
    const opsMap = new Map<number, InstitutionOperation>();
    for (const mod of modules) {
      for (const op of mod.operations) {
        if (!opsMap.has(op.id)) {
          opsMap.set(op.id, op);
        }
      }
    }

    // Group by operationType
    const grouped = new Map<number, OperationDisplay[]>();
    for (const op of opsMap.values()) {
      const list = grouped.get(op.operationType) ?? [];
      const iconInfo = OPERATION_ICONS[normalisePermissionName(op.operationName)] ?? DEFAULT_ICON;
      list.push({
        id: op.id,
        name: op.operationName,
        icon: iconInfo.icon,
        iconClass: iconInfo.iconClass,
      });
      grouped.set(op.operationType, list);
    }

    // Sort by operationType and build groups. The backend publishes types this component has no
    // label for (11, 12, 19, …); they collapse into a single trailing "Other" group rather than
    // leaking raw ids as headings.
    const labelled: OperationGroup[] = [];
    const other: OperationDisplay[] = [];
    for (const [type, operations] of [...grouped.entries()].sort(([a], [b]) => a - b)) {
      const label = OPERATION_TYPE_LABELS[type];
      if (label) {
        labelled.push({ label, operations });
      } else {
        other.push(...operations);
      }
    }

    return other.length > 0 ? [...labelled, { label: 'Other', operations: other }] : labelled;
  });

  readonly allOperations = computed(() =>
    this.operationGroups().flatMap((g) => g.operations.map((o) => o.name)),
  );

  /** Operation names each module actually maps, keyed by module name. A module–operation pair the
   *  backend does not map cannot be granted, so its cell is rendered disabled. */
  readonly #moduleOperations = computed(() => {
    const result: Record<string, Set<string>> = {};
    for (const mod of this.institutionModules().filter((m) => m.isEnabled)) {
      result[mod.moduleName] = new Set(mod.operations.map((op) => op.operationName));
    }
    return result;
  });

  /** Number of operations each module can be granted — the denominator of its count badge. */
  readonly moduleOperationTotals = computed(() => {
    const result: Record<string, number> = {};
    for (const [module, operations] of Object.entries(this.#moduleOperations())) {
      result[module] = operations.size;
    }
    return result;
  });

  isApplicable(module: string, operation: string): boolean {
    return this.#moduleOperations()[module]?.has(operation) ?? false;
  }

  /** Operations no currently visible module maps — their row select-all would be a no-op. */
  readonly #unusableOperations = computed(() => {
    const modules = this.filteredModules();
    return new Set(
      this.allOperations().filter((op) => !modules.some((mod) => this.isApplicable(mod, op))),
    );
  });

  isOperationSelectable(operation: string): boolean {
    return !this.#unusableOperations().has(operation);
  }

  readonly filteredOperationGroups = computed(() => {
    const query = this.#normalizedQuery();
    if (!query) return this.operationGroups();
    const moduleMatched = this.modules().some((m) => m.toLowerCase().includes(query));
    if (moduleMatched) return this.operationGroups();
    return this.operationGroups()
      .map((g) => ({
        ...g,
        operations: g.operations.filter((o) => o.name.toLowerCase().includes(query)),
      }))
      .filter((g) => g.operations.length > 0);
  });

  readonly hasAnyMatches = computed(
    () => this.filteredModules().length > 0 && this.filteredOperationGroups().length > 0,
  );

  // Dependency map: checking a key requires also checking its dependencies
  readonly #dependencies: Record<string, string[]> = {
    Update: ['View'],
    Delete: ['View'],
    Approve: ['View'],
    Reject: ['View'],
  };

  readonly permissionMap = signal<Record<string, Record<string, boolean>>>({});
  readonly #initialMap = signal<Record<string, Record<string, boolean>>>({});

  readonly hoveredModule = signal<string | null>(null);
  readonly hoveredOperation = signal<string | null>(null);

  // Per-module select-all state
  readonly moduleAllState = computed(() => {
    const map = this.permissionMap();
    const result: Record<string, AllState> = {};
    for (const mod of this.modules()) {
      const ops = this.allOperations().filter((op) => this.isApplicable(mod, op));
      const checked = ops.filter((op) => map[mod]?.[op]).length;
      if (ops.length === 0) {
        result[mod] = 'none';
        continue;
      }
      result[mod] = checked === ops.length ? 'all' : checked > 0 ? 'some' : 'none';
    }
    return result;
  });

  // Per-operation select-all state
  readonly operationAllState = computed(() => {
    const map = this.permissionMap();
    const result: Record<string, AllState> = {};
    for (const op of this.allOperations()) {
      const mods = this.modules().filter((mod) => this.isApplicable(mod, op));
      const checked = mods.filter((mod) => map[mod]?.[op]).length;
      if (mods.length === 0) {
        result[op] = 'none';
        continue;
      }
      result[op] = checked === mods.length ? 'all' : checked > 0 ? 'some' : 'none';
    }
    return result;
  });

  // Global select-all state
  readonly globalAllState = computed<AllState>(() => {
    const map = this.permissionMap();
    let total = 0;
    let checked = 0;
    for (const mod of this.modules()) {
      for (const op of this.allOperations()) {
        if (!this.isApplicable(mod, op)) continue;
        total++;
        if (map[mod]?.[op]) checked++;
      }
    }
    if (total === 0) return 'none';
    return checked === total ? 'all' : checked > 0 ? 'some' : 'none';
  });

  // Permission count per module
  readonly modulePermCount = computed(() => {
    const map = this.permissionMap();
    const result: Record<string, number> = {};
    for (const mod of this.modules()) {
      result[mod] = this.allOperations().filter(
        (op) => this.isApplicable(mod, op) && map[mod]?.[op],
      ).length;
    }
    return result;
  });

  // Dirty state
  readonly isDirty = computed(() => {
    const current = this.permissionMap();
    const initial = this.#initialMap();
    for (const mod of this.modules()) {
      for (const op of this.allOperations()) {
        if (current[mod]?.[op] !== initial[mod]?.[op]) return true;
      }
    }
    return false;
  });

  constructor() {
    // Institution modules define the full matrix; role/staffMember permission rows pre-select cells.
    effect(() => {
      const institutionMods = this.institutionModules().filter((m) => m.isEnabled);
      const rolePerms = this.rolePermissions() ?? [];

      if (institutionMods.length === 0) return;

      // Build lookup set of granted (moduleId, operationId) pairs
      const grantedSet = new Set<string>();
      for (const entry of rolePerms) {
        if (entry?.hasAccess && entry.isActive !== false) {
          grantedSet.add(`${entry.moduleId}-${entry.operationId}`);
        }
      }

      const map: Record<string, Record<string, boolean>> = {};
      for (const mod of institutionMods) {
        map[mod.moduleName] = {};
        for (const op of mod.operations) {
          map[mod.moduleName][op.operationName] = grantedSet.has(`${mod.id}-${op.id}`);
        }
      }

      this.permissionMap.set(map);
      this.#initialMap.set(structuredClone(map));
    });
  }

  updatePermission(module: string, operation: string, value: boolean): void {
    const map = structuredClone(this.permissionMap());
    map[module][operation] = value;
    if (value) {
      for (const dep of this.#dependencies[operation] ?? []) {
        if (map[module][dep] !== undefined) {
          map[module][dep] = true;
        }
      }
    }
    this.permissionMap.set(map);
  }

  toggleModule(module: string): void {
    const newValue = this.moduleAllState()[module] !== 'all';
    const map = structuredClone(this.permissionMap());
    for (const op of this.allOperations()) {
      if (!this.isApplicable(module, op)) continue;
      map[module][op] = newValue;
    }
    this.permissionMap.set(map);
  }

  toggleOperation(operation: string): void {
    const newValue = this.operationAllState()[operation] !== 'all';
    const map = structuredClone(this.permissionMap());
    for (const mod of this.modules()) {
      if (!this.isApplicable(mod, operation)) continue;
      map[mod][operation] = newValue;
      if (newValue) {
        for (const dep of this.#dependencies[operation] ?? []) {
          if (map[mod][dep] !== undefined) {
            map[mod][dep] = true;
          }
        }
      }
    }
    this.permissionMap.set(map);
  }

  toggleAll(): void {
    const newValue = this.globalAllState() !== 'all';
    const map = structuredClone(this.permissionMap());
    for (const mod of this.modules()) {
      for (const op of this.allOperations()) {
        if (!this.isApplicable(mod, op)) continue;
        map[mod][op] = newValue;
      }
    }
    this.permissionMap.set(map);
  }

  toggleModuleCard(module: string): void {
    this.expandedModule.update((current) => (current === module ? null : module));
  }

  onSave(): void {
    const institutionMods = this.institutionModules().filter((m) => m.isEnabled);
    const currentMap = this.permissionMap();

    const payload: PermissionSavePayload = {
      modules: institutionMods.map((mod) => ({
        moduleId: mod.id,
        moduleName: mod.moduleName,
        operations: mod.operations.map((op) => ({
          operationId: op.id,
          operationName: op.operationName,
          operationType: op.operationType,
          hasAccess: currentMap[mod.moduleName]?.[op.operationName] ?? false,
        })),
      })),
    };

    this.savePermissions.emit(payload);
  }

  markAsPristine(): void {
    this.#initialMap.set(structuredClone(this.permissionMap()));
  }
}
