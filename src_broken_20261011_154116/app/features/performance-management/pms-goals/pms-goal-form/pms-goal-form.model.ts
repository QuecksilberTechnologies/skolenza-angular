import { Goal, GoalCategory, PmsStatus } from '@shared/interfaces';

/** Editable shape backing the goal Signal Form (dates as Date objects). */
export interface GoalFormModel {
  title: string;
  description: string;
  category: GoalCategory;
  weight: number;
  progress: number;
  startDate: Date | null;
  dueDate: Date | null;
  status: PmsStatus;
}

export function emptyGoalForm(): GoalFormModel {
  return {
    title: '',
    description: '',
    category: 'Business',
    weight: 0,
    progress: 0,
    startDate: null,
    dueDate: null,
    status: 'Draft',
  };
}

export function goalToForm(goal: Goal): GoalFormModel {
  return {
    title: goal.title,
    description: goal.description,
    category: goal.category,
    weight: goal.weight,
    progress: goal.progress,
    startDate: goal.startDate ? new Date(goal.startDate) : null,
    dueDate: goal.dueDate ? new Date(goal.dueDate) : null,
    status: goal.status,
  };
}

function ymd(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Build the domain Goal from the edited form. */
export function formToGoal(model: GoalFormModel, base?: Goal): Goal {
  return {
    id: base?.id ?? `g-${Date.now()}`,
    title: model.title.trim(),
    description: model.description.trim(),
    category: model.category,
    weight: model.weight,
    progress: model.progress,
    startDate: ymd(model.startDate),
    dueDate: ymd(model.dueDate),
    status: model.status,
    ownerId: base?.ownerId ?? 'e-101',
    ownerName: base?.ownerName ?? 'Aarav Sharma',
  };
}
