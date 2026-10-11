import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  templateUrl: './coming-soon.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoon {
  title = input<string>('Coming Soon');
  description = input<string>(
    "We're working hard to bring you this feature. Please check back soon!",
  );
}
