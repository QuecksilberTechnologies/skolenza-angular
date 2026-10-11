import { PmsFilter } from './pms-common';

/** Common paginated list request. TODO: API — wire to backend query params. */
export interface PmsListRequest extends PmsFilter {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortOrder?: string | null;
  isActive?: boolean;
}
