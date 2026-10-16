import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import AuthHeaderLogo from '@shared/components/auth-header-logo/auth-header-logo';

/**
 * The shell every `/auth/*` page sits in: landmark, ground, card, logo, heading.
 *
 * It exists because those four things were hand-copied into nine templates and had drifted into
 * three different designs. Page templates project only their own content.
 */
@Component({
  selector: 'app-auth-card',
  imports: [RouterModule, AuthHeaderLogo],
  templateUrl: './auth-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AuthCard {
  /** `lg` is the two-column registration form; everything else is a single column. */
  readonly width = input<'sm' | 'lg'>('sm');

  /** `null` renders the logo decorative - the login page, which would otherwise link to itself. */
  readonly logoLink = input<string | null>('/auth/login');

  readonly heading = input.required<string>();

  readonly subheading = input<string | null>(null);
}
