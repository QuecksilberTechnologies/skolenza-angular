import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-popup',
  imports: [],
  templateUrl: './popup.html',
  host: {
    class:
      'relative block bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg',
    '[attr.aria-label]': 'ariaLabel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Popup {
  readonly ariaLabel = input<string>('Popup');
  readonly closeAriaLabel = input<string>('Close popup');
  readonly contentClass = input<string>('max-h-[70vh] overflow-y-auto');
  readonly closed = output<void>();

  hide(): void {
    this.closed.emit();
  }
}
