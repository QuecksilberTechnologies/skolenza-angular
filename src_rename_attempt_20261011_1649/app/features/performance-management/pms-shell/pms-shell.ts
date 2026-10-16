import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Common } from '@core/services';

interface PmsTab {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-pms-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="mb-4 flex gap-1 overflow-x-auto bg-white px-4 py-2 shadow-sm dark:bg-zinc-900"
      aria-label="Performance sections"
    >
      @for (tab of tabs; track tab.link) {
        <a
          [routerLink]="tab.link"
          routerLinkActive="bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-200"
          class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <i [class]="tab.icon" aria-hidden="true"></i>
          <span>{{ tab.label }}</span>
        </a>
      }
    </nav>

    <div class="m-4!">
      <router-outlet />
    </div>
  `,
})
export default class PmsShell {
  readonly #commonService = inject(Common);

  protected readonly tabs: PmsTab[] = [
    { label: 'Dashboard', icon: 'pi pi-th-large', link: 'dashboard' },
    { label: 'Goals', icon: 'pi pi-flag', link: 'goals' },
    { label: 'Reviews', icon: 'pi pi-file-edit', link: 'reviews' },
    { label: 'Feedback', icon: 'pi pi-comments', link: 'feedback' },
    { label: 'One-on-One', icon: 'pi pi-users', link: 'one-on-one' },
    { label: 'History', icon: 'pi pi-history', link: 'history' },
  ];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Performance',
      pageDescription: 'Goals, reviews, feedback, and growth in one place.',
      pageIcon: 'pi pi-chart-line',
      isBreadcrumbShow: false,
    });
  }
}
