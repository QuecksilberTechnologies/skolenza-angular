import { ChangeDetectionStrategy, Component } from '@angular/core';

import AppLogo from '@layout/app-logo/app-logo';

@Component({
  selector: 'app-logout',
  imports: [AppLogo],
  templateUrl: './logout.html',
  styleUrl: './logout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Logout {}
