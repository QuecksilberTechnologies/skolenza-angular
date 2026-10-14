import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import AuthHeaderLogo from '@shared/components/auth-header-logo/auth-header-logo';

/**
 * Two-panel `/auth/*` shell: a decorative brand panel on the left (lg and up) and the page's own
 * form on the right. Same landmark, logo and heading contract as `AuthCard`.
 */
@Component({
  selector: 'app-auth-split-card',
  imports: [RouterModule, NgOptimizedImage, AuthHeaderLogo],
  templateUrl: './auth-split-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AuthSplitCard {
  /** `lg` gives the form panel more room - the two-column registration form. */
  readonly width = input<'sm' | 'lg'>('sm');

  /** `null` renders the logo decorative - the login page, which would otherwise link to itself. */
  readonly logoLink = input<string | null>('/auth/login');

  readonly heading = input.required<string>();

  readonly subheading = input<string | null>(null);

  protected readonly features = [
    { icon: 'pi-book', title: 'Interactive Courses', description: 'Learn with engaging content' },
    { icon: 'pi-users', title: 'Expert Instructors', description: 'Gain industry-relevant skills' },
    {
      icon: 'pi-chart-bar',
      title: 'Track Your Progress',
      description: 'Stay motivated with real insights',
    },
  ] as const;
}
