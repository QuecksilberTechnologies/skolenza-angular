import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

@Component({
  selector: 'app-profile-empty',
  imports: [ButtonModule],
  templateUrl: './profile-empty.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEmpty {
  readonly message = input.required<string>();
  readonly description = input.required<string>();
  readonly tabIcon = input.required<string>();
  readonly roleTypeId = input<number>();
  readonly isShowAddBtn = input<boolean>(true);
  readonly retry = output<void>();
  readonly add = output<void>();

  onRetry() {
    this.retry.emit();
  }

  onAdd() {
    this.add.emit();
  }
}
