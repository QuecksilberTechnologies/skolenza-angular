import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-empty-message',
  imports: [],
  templateUrl: './table-empty-message.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableEmptyMessage {
  readonly icon = input<string>();
  readonly message = input<string>();
  readonly subMessage = input<string>();
}
