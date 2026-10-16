import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MenuItem } from '@openng/optimus-ui/api';
import { BreadcrumbModule } from '@openng/optimus-ui/breadcrumb';

@Component({
  selector: 'app-sub-header',
  imports: [BreadcrumbModule],
  templateUrl: './sub-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubHeader {
  pageIcon = input<string>('');
  pageTitle = input<string>('');
  pageDescription = input<string>('');
  isBreadcrumbShow = input<boolean>(false);
  breadcrumbItems = input<MenuItem[]>([]);
}
