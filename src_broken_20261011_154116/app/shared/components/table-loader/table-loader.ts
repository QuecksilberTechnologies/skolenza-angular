import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';

@Component({
  selector: 'app-table-loader',
  imports: [ProgressSpinnerModule],
  templateUrl: './table-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableLoader {}
