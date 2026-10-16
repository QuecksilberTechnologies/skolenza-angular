import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { OkrLevel } from '@shared/interfaces';

const LEVEL_META: Record<OkrLevel, { icon: string; classes: string }> = {
  Company: {
    icon: 'pi pi-building',
    classes: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  },
  Department: {
    icon: 'pi pi-sitemap',
    classes: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  Team: {
    icon: 'pi pi-users',
    classes: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  },
  Personal: {
    icon: 'pi pi-user',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
};

@Component({
  selector: 'app-okr-level-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      [class]="meta().classes"
    >
      <i [class]="meta().icon" aria-hidden="true"></i>
      {{ level() }}
    </span>
  `,
})
export class OkrLevelBadge {
  readonly level = input.required<OkrLevel>();
  protected readonly meta = computed(() => LEVEL_META[this.level()]);
}
