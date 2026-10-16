import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

/** A state worth a chip; the icon keeps it readable without colour. */
export interface RowStatusChip {
  severity: 'success' | 'warn' | 'danger' | 'secondary';
  icon: string;
}

/**
 * The first line on the right of a dashboard list row: a chip for a state, plain text otherwise.
 * Fixed height either way, so rows line up across cards whichever one they show.
 */
@Component({
  selector: 'app-row-status',
  imports: [TagModule],
  template: `
    @if (chip(); as chip) {
      <p-tag class="py-0!" [value]="text()" [severity]="chip.severity" [icon]="chip.icon" />
    } @else {
      <span class="font-medium text-zinc-700 dark:text-zinc-200">{{ text() }}</span>
    }
  `,
  host: { class: 'flex h-6 items-center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowStatus {
  readonly text = input.required<string>();
  readonly chip = input<RowStatusChip | null>(null);
}
