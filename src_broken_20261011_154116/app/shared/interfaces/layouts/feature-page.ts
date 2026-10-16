/**
 * `GET /Navigation/my-menu` — the caller's own navigation tree, the source of the aside menu.
 *
 * The backend scopes and permission-filters this per user, so what arrives is already what the
 * session may see. Every node carries `children` and `operations`; both are empty arrays on a node
 * that has none, never omitted.
 */
export interface FeaturePageOperation {
  id: number;
  name: string;
  iconKey: string | null;
}

export interface FeaturePageNode {
  id: number;
  moduleCode: string;
  moduleName: string;
  pageName: string;
  displayName: string;
  /**
   * The backend's own path. It does NOT line up with this app's routes for most leaves, so the
   * sidebar resolves routes from `layout/app-aside-menu/aside-menu-module-map.ts` instead.
   */
  urlPath: string | null;
  /**
   * A Bootstrap Icons class (`bi bi-*`) on module nodes. Not rendered: this app does not load
   * Bootstrap Icons, so icons come from the module map.
   */
  iconKey: string | null;
  parentModuleId: number | null;
  isLeafNode: boolean;
  moduleScope: number;
  children: FeaturePageNode[];
  /** Empty on a header; the granted operations on a leaf page. */
  operations: FeaturePageOperation[];
}

export interface NavigationMenuData {
  /** `InstitutionStaffMember`, `Host`, and so on — the scope the backend resolved for this session. */
  userType: string;
  items: FeaturePageNode[];
}

export interface GetMyMenuRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: NavigationMenuData | null;
}
