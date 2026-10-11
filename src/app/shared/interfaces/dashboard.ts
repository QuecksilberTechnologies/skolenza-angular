export interface DashboardStatisticRequest {
  RoleId: number;
  UserStaffMemberId?: string;
}

export interface DashboardStatistic {
  totalStaffMembers: number;
  newHiresThisMonth: number;
  openPositions: number;
  pendingApprovals: number;
}

export interface AssetStatisticRequest {
  RoleId: number;
  UserStaffMemberId?: string;
}

export interface AssetStatistic {
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  underMaintenance: number;
}
