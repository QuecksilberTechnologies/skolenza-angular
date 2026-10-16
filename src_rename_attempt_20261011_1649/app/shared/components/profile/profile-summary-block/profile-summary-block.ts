import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-profile-summary-block',
  imports: [],
  templateUrl: './profile-summary-block.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSummaryBlock {
  readonly label = input<string>();
  readonly icon = input<string>();
  readonly value = input<string | number | null>();
}
