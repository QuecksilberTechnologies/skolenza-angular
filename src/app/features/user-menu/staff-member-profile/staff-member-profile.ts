import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { TabsModule } from '@openng/optimus-ui/tabs';

import { Common } from '@core/services';
import { ProfileSummary } from '@shared/index';

@Component({
  selector: 'app-profile',
  imports: [RouterModule, TabsModule, ProfileSummary],
  templateUrl: './staff-member-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberProfile implements OnInit {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #commonService = inject(Common);
  readonly activeTabIndex = signal('basic-info');
  readonly activePage = signal('basic-info');
  readonly staffMemberId = signal<string | null>('');
  readonly countryId = signal<number | null>(0);

  readonly tabs = [
    { label: 'Overview', route: 'basic-info', icon: 'pi pi-user' },
    { label: 'Bank', route: 'bank-info', icon: 'pi pi-building-columns' },
    { label: 'Contact', route: 'contact-info', icon: 'pi pi-address-book' },
    { label: 'Experience', route: 'experience-info', icon: 'pi pi-briefcase' },
    { label: 'Insurance', route: 'insurance-info', icon: 'pi pi-shield' },
    { label: 'Policies', route: 'policy-info', icon: 'pi pi-book' },
    { label: 'Identity', route: 'identity-info', icon: 'pi pi-id-card' },
    { label: 'Education', route: 'education-info', icon: 'pi pi-graduation-cap' },
    { label: 'Dependent', route: 'dependent-info', icon: 'pi pi-users' },
    { label: 'Leave', route: 'leave-info', icon: 'pi pi-calendar-minus' },
    { label: 'Files', route: 'files-info', icon: 'pi pi-folder' },
  ];

  constructor() {
    // Page Header Info
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Profile Settings',
      pageDescription: 'Customize your personal information and preferences',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: false,
    });

    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.staffMemberId.set(params['staffMemberId'] || '');
      this.countryId.set(params['countryId'] || '');
    });
  }

  ngOnInit() {
    this.setCurrentPage(this.#router.url);

    this.#router.events.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (event) => {
        if (event instanceof NavigationEnd) {
          this.setCurrentPage(event.urlAfterRedirects);
        }
      },
    });
  }

  setCurrentPage(path: string) {
    // Remove query params and fragment from the path
    const cleanPath = path.split(/[?#]/)[0];
    const currentPage = cleanPath?.split('/').pop() || 'basic-info';

    this.activePage.set(currentPage);
    this.activeTabIndex.set(this.activePage());

    this.updatePageHeader();
  }

  updatePageHeader() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Profile Settings',
      pageDescription: (() => {
        const descriptions: Record<string, string> = {
          'basic-info': 'Update your basic staffMember details and personalize your profile.',
          'education-info': 'Add or update your educational qualifications here.',
          'experience-info': 'Manage your professional experience history.',
          'insurance-info': 'View and edit your insurance information.',
          'policy-info': 'View and map the policies that apply to this staffMember.',
          'leave-info': 'Check leave balances and apply for new leave.',
          'identity-info': 'Manage identification and verification information.',
          'dependent-info': 'Add your dependents to keep your records up-to-date.',
          'bank-info': 'Update your banking information securely.',
          'contact-info': 'Change your personal contact and address details.',
          'files-info': 'Manage your personal and professional documents.',
        };
        return (
          descriptions[this.activePage()] ?? 'Customize your personal information and preferences'
        );
      })(),
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: false,
    });
  }
}
