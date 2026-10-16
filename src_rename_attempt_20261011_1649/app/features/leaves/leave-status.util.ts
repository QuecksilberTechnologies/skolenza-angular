export type LeaveStatusSeverity = 'success' | 'warn' | 'danger' | 'secondary';

export function leaveStatusSeverity(status: string | null | undefined): LeaveStatusSeverity {
  switch (status) {
    case 'Approved':
      return 'success';
    case 'Rejected':
      return 'danger';
    case 'Cancelled':
      return 'secondary';
    default:
      return 'warn';
  }
}
