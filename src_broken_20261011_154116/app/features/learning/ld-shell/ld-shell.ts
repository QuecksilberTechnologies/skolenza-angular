import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Common } from '@core/services';

interface LdTab {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-ld-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="mb-4 flex gap-1 overflow-x-auto border-b border-gray-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"
      aria-label="Learning sections"
    >
      @for (tab of tabs; track tab.link) {
        <a
          [routerLink]="tab.link"
          routerLinkActive="bg-primary-50 font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-200"
          class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition duration-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
export default class LdShell {
  readonly #commonService = inject(Common);

  protected readonly tabs: LdTab[] = [
    { label: 'Dashboard', icon: 'pi pi-th-large', link: 'dashboard' },
    { label: 'My Learning', icon: 'pi pi-book', link: 'my-learning' },
    { label: 'Catalog', icon: 'pi pi-objects-column', link: 'catalog' },
    { label: 'Learning Paths', icon: 'pi pi-sitemap', link: 'paths' },
    { label: 'Assigned', icon: 'pi pi-inbox', link: 'assigned' },
    { label: 'Certificates', icon: 'pi pi-verified', link: 'certificates' },
    { label: 'Assessments', icon: 'pi pi-question-circle', link: 'assessments' },
    { label: 'Calendar', icon: 'pi pi-calendar', link: 'calendar' },
    { label: 'Knowledge Base', icon: 'pi pi-database', link: 'knowledge' },
    { label: 'Admin', icon: 'pi pi-cog', link: 'admin' },
  ];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Learning & Desk',
      pageDescription: 'Browse courses, track progress, and earn certificates.',
      pageIcon: 'pi pi-graduation-cap',
      isBreadcrumbShow: false,
    });
  }
}
