import { IKeyResult, IOkr, OkrLevel, OkrStatus, OkrVisibility } from '@shared/interfaces';

/** Editable shape backing the Signal Form (dates as yyyy-MM-dd strings for native inputs). */
export interface KeyResultForm {
  id: string;
  title: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  weight: number;
}

export interface OkrFormModel {
  title: string;
  description: string;
  objective: string;
  ownerStaffMemberId: string;
  ownerName: string;
  departmentId: string;
  level: OkrLevel;
  quarter: string;
  startDate: Date | null;
  endDate: Date | null;
  weight: number;
  status: OkrStatus;
  visibility: OkrVisibility;
  progress: number;
  keyResults: KeyResultForm[];
}

const DEPARTMENT_NAMES: Record<string, string> = {
  'dep-eng': 'Engineering',
  'dep-sales': 'Sales',
  'dep-mkt': 'Marketing',
  'dep-hr': 'Human Resources',
  'dep-prod': 'Product',
  'dep-fin': 'Finance',
};

export function emptyKeyResult(id: string): KeyResultForm {
  return { id, title: '', metric: '', target: 0, current: 0, unit: '', weight: 0 };
}

export function emptyOkrForm(): OkrFormModel {
  return {
    title: '',
    description: '',
    objective: '',
    ownerStaffMemberId: '',
    ownerName: '',
    departmentId: '',
    level: 'Team',
    quarter: 'Q3-2026',
    startDate: null,
    endDate: null,
    weight: 0,
    status: 'Draft',
    visibility: 'Public',
    progress: 0,
    keyResults: [emptyKeyResult('kr-new-1')],
  };
}

export function okrToForm(okr: IOkr): OkrFormModel {
  return {
    title: okr.title,
    description: okr.description,
    objective: okr.objective,
    ownerStaffMemberId: okr.ownerStaffMemberId,
    ownerName: okr.ownerName,
    departmentId: okr.departmentId,
    level: okr.level,
    quarter: okr.quarter,
    startDate: okr.startDate ? new Date(okr.startDate) : null,
    endDate: okr.endDate ? new Date(okr.endDate) : null,
    weight: okr.weight,
    status: okr.status,
    visibility: okr.visibility,
    progress: okr.progress,
    keyResults: okr.keyResults.map((kr) => ({
      id: kr.id,
      title: kr.title,
      metric: kr.metric,
      target: kr.target,
      current: kr.current,
      unit: kr.unit,
      weight: kr.weight,
    })),
  };
}

function krProgress(kr: KeyResultForm): number {
  if (!kr.target) return 0;
  return Math.max(0, Math.min(100, Math.round((kr.current / kr.target) * 100)));
}

/** Format a Date as yyyy-MM-dd for the API (empty string when unset). */
function ymd(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Build the full domain object the API expects from the edited form model. */
export function formToOkr(model: OkrFormModel, base?: IOkr): IOkr {
  const keyResults: IKeyResult[] = model.keyResults.map((kr) => ({
    ...kr,
    progress: krProgress(kr),
  }));
  const overall = keyResults.length
    ? Math.round(keyResults.reduce((s, kr) => s + (kr.progress * kr.weight) / 100, 0))
    : model.progress;

  return {
    id: base?.id ?? '',
    title: model.title.trim(),
    description: model.description.trim(),
    objective: model.objective.trim(),
    ownerStaffMemberId: model.ownerStaffMemberId,
    ownerName: model.ownerName.trim(),
    departmentId: model.departmentId,
    department: DEPARTMENT_NAMES[model.departmentId] ?? model.departmentId,
    level: model.level,
    quarter: model.quarter,
    startDate: ymd(model.startDate),
    endDate: ymd(model.endDate),
    weight: model.weight,
    status: model.status,
    visibility: model.visibility,
    progress: overall,
    dueDate: ymd(model.endDate),
    keyResults,
    createdDate: base?.createdDate ?? new Date().toISOString(),
    isActive: base?.isActive ?? true,
  };
}
