import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';

@Component({
  selector: 'app-gantt-view',
  imports: [ButtonModule, CardModule],
  templateUrl: './gantt-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GanttViewComponent {}
