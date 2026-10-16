import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-header-loader',
  imports: [],
  templateUrl: './header-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HeaderLoader {}
