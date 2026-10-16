import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';

import { TaskChecklistItem } from '@shared/interfaces';

@Component({
  selector: 'app-task-checklist',
  imports: [FormsModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-zinc-200">Checklist</h3>
        <span class="text-xs text-gray-400">{{ doneCount() }}/{{ items().length }}</span>
      </div>

      @if (items().length) {
        <ul class="flex flex-col gap-2">
          @for (item of items(); track item.id) {
            <li class="flex items-center gap-2">
              <p-checkbox
                [binary]="true"
                [ngModel]="item.done"
                (onChange)="itemToggle.emit(item.id)"
                [inputId]="'chk-' + item.id"
              />
              <label
                [for]="'chk-' + item.id"
                class="text-sm"
                [class.line-through]="item.done"
                [class.text-gray-400]="item.done"
              >
                {{ item.label }}
              </label>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-gray-400">No checklist items.</p>
      }
    </div>
  `,
})
export class TaskChecklist {
  readonly items = input.required<TaskChecklistItem[]>();
  readonly itemToggle = output<string>();
  protected readonly doneCount = computed(() => this.items().filter((i) => i.done).length);
}
