export type TeamRoleType = 'Admin' | 'Member' | 'Analyst' | 'Developer' | 'Support' | 'Trial';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRoleType;
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: number;
  createdAt: string;
}
