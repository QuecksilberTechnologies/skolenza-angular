import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-profile-summary-block-shimmer',
  imports: [SkeletonModule],
  templateUrl: './profile-summary-block-shimmer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSummaryBlockShimmer {}
