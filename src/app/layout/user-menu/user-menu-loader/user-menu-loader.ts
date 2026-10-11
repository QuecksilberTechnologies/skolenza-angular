import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-user-menu-loader',
  imports: [SkeletonModule],
  templateUrl: './user-menu-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuLoader {
  /** Placeholder widths for the CommonMenu links; the sign-out row is rendered separately. */
  readonly linkWidths = ['4.5rem', '6.5rem', '5.5rem', '7.5rem'];
}
