import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-permission-matrix-loader',
  imports: [SkeletonModule],
  templateUrl: './permission-matrix-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionMatrixLoader {
  protected readonly columns = [0, 1, 2, 3, 4];
  protected readonly rows = [0, 1, 2, 3, 4, 5];
}
