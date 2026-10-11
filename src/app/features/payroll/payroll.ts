import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TabsModule } from '@openng/optimus-ui/tabs';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';

import { PayrollStatsLoader } from './payroll-stats-loader/payroll-stats-loader';
import { PayrollStats } from './payroll-stats/payroll-stats';
import { PayrollStore } from './payroll.store';

@Component({
  selector: 'app-payroll',
  imports: [RouterModule, TabsModule, PayrollStats, PayrollStatsLoader],
  providers: [PayrollStore],
  templateUrl: './payroll.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Payroll implements OnInit {
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authStore = inject(AuthStore);
  readonly store = inject(PayrollStore);

  readonly isAdmin = computed(() => this.#authStore.roleTypeId() !== 2);
  readonly activeTab = signal('overview');

  readonly allTabs = [
    { label: 'Payroll Overview', route: 'overview', icon: 'pi pi-list' },
    { label: 'Salary Structure', route: 'salary-structure', icon: 'pi pi-money-bill' },
    { label: 'Payslips', route: 'payslips', icon: 'pi pi-file' },
    { label: 'Tax Settings', route: 'tax-settings', icon: 'pi pi-percentage' },
  ];

  readonly tabs = computed(() =>
    this.isAdmin() ? this.allTabs : this.allTabs.filter((t) => t.route === 'payslips'),
  );

  constructor() {
    const roleTypeId = this.#authStore.roleTypeId();
    const isStaffMember = roleTypeId === 2;

    this.#commonService.setPageHeaderInfo({
      pageTitle: isStaffMember ? 'My Payslips' : 'Payroll Management',
      pageDescription: isStaffMember
        ? 'View your salary payslips and payment history.'
        : 'Manage staffMember salaries, payroll processing, and payslips.',
      pageIcon: 'pi pi-wallet',
      isBreadcrumbShow: false,
    });
  }

  async ngOnInit(): Promise<void> {
    this.store.loadAll();

    // Await storage directly so the staffMember filter is applied reliably. Reading
    // authStore.user() synchronously races the fire-and-forget
    // loadFromStorage() hook: when it loses, the filter is skipped and every
    // staffMember's payslips leak through.
    const loginInfo = await this.#commonService.getLoginInfo();
    const sessionUser = loginInfo?.user;
    // Fail closed: only a positively identified admin (1) or manager (3) sees every
    // payslip. `primaryRole` is optional, so an unknown role stays scoped to the user.
    const roleTypeId = sessionUser?.primaryRole?.roleTypeId;
    const isStaffMember = roleTypeId !== 1 && roleTypeId !== 3;

    if (isStaffMember && sessionUser) {
      this.store.setStaffMemberFilter(sessionUser.staffMemberId);
      this.#router.navigate(['/app/payroll/payslips'], { replaceUrl: true });
    }

    this.#setActiveTabFromUrl(this.#router.url);
    this.#router.events.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.#setActiveTabFromUrl(event.urlAfterRedirects);
      }
    });
  }

  #setActiveTabFromUrl(url: string): void {
    const segment = url.split('/').pop() || 'overview';
    const matched = this.allTabs.find((t) => t.route === segment);
    this.activeTab.set(matched ? matched.route : 'overview');
  }
}
