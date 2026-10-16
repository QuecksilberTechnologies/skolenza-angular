import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Bordered row pairing a label (plus optional hint) with a switch.
 *
 * Purely presentational — the `p-toggleswitch` is projected, so the caller keeps
 * owning the form binding and no Signal Forms plumbing crosses the boundary. The
 * projected switch must carry `inputId` matching {@link inputId} for the label to
 * address it.
 *
 * The box is the host, so the element is itself the grid item and callers can pass
 * layout classes (`md:col-span-2`) straight onto the tag.
 */
@Component({
  selector: 'app-toggle-field',
  template: `
    <label [for]="inputId()" class="cursor-pointer">
      <span class="block font-medium">{{ label() }}</span>
      @if (hint()) {
        <span class="block text-xs text-gray-500 dark:text-zinc-400">
          {{ hint() }}
        </span>
      }
    </label>
    <ng-content />
  `,
  host: {
    class:
      'flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-zinc-700',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
}
