import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-aside-menu-loader',
  imports: [SkeletonModule],
  templateUrl: './aside-menu-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AsideMenuLoader {
  readonly sections = [
    { headerWidth: '4.5rem', items: ['6rem'] },
    {
      headerWidth: '6rem',
      items: ['6rem', '5rem', '4.5rem', '5.5rem', '4rem', '6.5rem', '5rem', '4.5rem'],
    },
    { headerWidth: '4rem', items: ['5rem'] },
  ];
}
