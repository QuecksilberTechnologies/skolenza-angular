import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

@Component({
  selector: 'app-kanban-empty-state',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="empty-state flex h-full flex-col items-center justify-center py-8 text-center">
      <i class="pi pi-inbox mb-3 text-4xl text-gray-400"></i>
      <h3 class="mb-1 text-lg font-semibold text-gray-700">{{ title() }}</h3>
      <p class="mb-4 text-gray-500">{{ description() }}</p>
      <p-button
        [label]="buttonLabel()"
        [icon]="buttonIcon()"
        (onClick)="buttonClick.emit()"
        [size]="buttonSize()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class KanbanEmptyStateComponent {
  title = input.required<string>();
  description = input.required<string>();
  buttonLabel = input.required<string>();
  buttonIcon = input<string>('pi pi-plus');
  buttonSize = input<'small' | 'large'>('small');
  buttonClick = output<void>();
}
