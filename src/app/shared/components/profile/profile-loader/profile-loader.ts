import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-profile-loader',
  imports: [SkeletonModule],
  templateUrl: './profile-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileLoader {}
