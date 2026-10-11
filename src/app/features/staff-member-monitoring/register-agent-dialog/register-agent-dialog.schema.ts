import * as z from 'zod';

/** Device name limits follow `RegisterStaffMemberMonitoringAgentCommandHandler`: required, 200 max. */
export const registerAgentSchema = z.object({
  staffMemberId: z.string().min(1, 'StaffMember is required'),
  deviceName: z
    .string()
    .trim()
    .min(1, 'Device name is required')
    .max(200, 'Device name cannot exceed 200 characters'),
});

export type RegisterAgentModel = z.input<typeof registerAgentSchema>;
