import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DrawerModule } from '@openng/optimus-ui/drawer';

import { ILeaveRule } from '@shared/interfaces';

import LeaveRuleView from '../leave-rule-view/leave-rule-view';

/**
 * Drawer showing a single leave rule.
 *
 * Split out of the leave rules page so the drawer's `#header` marker no longer
 * collides with the table's — Optimus resolves projected templates by reference
 * name, which must be unique within a template.
 */
@Component({
  selector: 'app-leave-rule-detail-drawer',
  imports: [DrawerModule, LeaveRuleView],
  template: `
    <p-drawer
      [(visible)]="visible"
      position="right"
      styleClass="w-full! sm:min-w-[40rem] sm:w-auto!"
    >
      <ng-template #header>
        <div class="flex items-center gap-2 py-1">
          <span
            class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900"
          >
            <i class="pi pi-briefcase text-2xl text-primary-600 dark:text-primary-300"></i>
          </span>
          <div>
            <div class="text-lg font-semibold text-gray-800 dark:text-zinc-100">
              {{ leaveRule()?.leaveTypeName || 'Leave Rule Details' }}
            </div>
            <div class="text-sm text-gray-500 dark:text-zinc-400">Leave Rule Details</div>
          </div>
        </div>
      </ng-template>
      <app-leave-rule-view [leaveRule]="leaveRule()" />
    </p-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveRuleDetailDrawer {
  readonly visible = model(false);
  readonly leaveRule = input<ILeaveRule>();
}
