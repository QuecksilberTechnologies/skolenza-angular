import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

@Component({
  selector: 'app-table-action-button',
  imports: [ButtonModule],
  templateUrl: './table-action-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableActionButton {
  readonly ariaLabel = input('Actions');
  readonly disabled = input(false);
  /** Borderless until hovered — for rows whose own hover background would swallow the filled button. */
  readonly text = input(false);
  readonly action = output<Event>();

  onAction(e: Event) {
    this.action.emit(e);
  }
}
