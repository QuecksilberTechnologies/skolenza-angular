export interface LeaveTypeBreakdown {
  type: string;
  days: number;
  change: string;
  color: string;
}

export interface LeaveBreakdown {
  total: number;
  change: string;
  types: LeaveTypeBreakdown[];
}

export interface ActivityHeatmapCell {
  day: string;
  time: string;
  leaveRequests: number;
  interviews: number;
  onboarding: number;
  intensity: string;
}
