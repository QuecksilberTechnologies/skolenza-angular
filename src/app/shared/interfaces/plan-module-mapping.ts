/**
 * Node of `GET /PlanModuleMapping/options/{subscriptionPlanId}`. The tree is recursive and at
 * least three levels deep (`Common` → `Notifications` → `Message`), so nothing may assume a depth.
 * Note the key names differ from every other module shape in the app: `moduleId`, not `id`, and
 * `children`, not `childModules`.
 */
export interface PlanModuleOption {
  moduleId: number;
  moduleName: string;
  displayName: string;
  /** A parent can be mapped while none of its children are — pre-selection is per node. */
  isMapped: boolean;
  isActive: boolean;
  children: PlanModuleOption[];
}

/** The endpoint already returns only the modules in scope for the plan; the client filters nothing. */
export interface PlanModuleOptions {
  subscriptionPlanId: number;
  modules: PlanModuleOption[];
}

export interface GetPlanModuleOptionsRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: PlanModuleOptions | null;
}

/** `POST /PlanModuleMapping/save` replaces the whole mapping — an omitted id is unmapped. */
export interface SavePlanModuleMappingReq {
  subscriptionPlanId: number;
  moduleIds: number[];
  remark?: string | null;
}

export interface PlanModuleMappingMutationRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}
