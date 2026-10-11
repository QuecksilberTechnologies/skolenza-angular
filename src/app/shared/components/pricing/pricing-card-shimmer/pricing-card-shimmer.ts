import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-pricing-card-shimmer',
  imports: [SkeletonModule],
  templateUrl: './pricing-card-shimmer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingCardShimmer {
  /** One width per FEATURE_PREVIEW_COUNT row; uneven so the list reads as text, not as a block. */
  protected readonly featureWidths = ['85%', '70%', '90%', '65%', '80%', '72%'];
}
