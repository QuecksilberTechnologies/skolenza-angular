import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-profile-verification-status',
  imports: [],
  templateUrl: './profile-verification-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileVerificationStatus {
  isInfoVerified = input<boolean>();
}
