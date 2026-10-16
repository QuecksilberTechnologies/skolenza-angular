import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CommonMenuApi } from '@core/services/common-menu-api';
import { AuthStore } from '@core/stores';
import { CommonMenuItem, CommonMenuResponse } from '@shared/interfaces';

import { UserMenu } from './user-menu';

const profileMenu = [
  {
    moduleId: 2,
    moduleName: 'Profile',
    children: [
      { moduleId: 11, moduleName: 'Sign-Out', displayName: 'Sign out', urlPath: 'sign-out' },
      { moduleId: 3, moduleName: 'My-Profile', displayName: 'Profile', urlPath: 'profile' },
    ],
  },
] as unknown as CommonMenuItem[];

const flattenedProfileMenu = [
  {
    moduleId: 39,
    moduleName: 'My-Profile',
    displayName: 'Profile',
    urlPath: 'profile',
    children: [],
  },
  {
    moduleId: 40,
    moduleName: 'Help-Support',
    displayName: 'Help & Support',
    urlPath: 'help-support',
    children: [],
  },
  {
    moduleId: 41,
    moduleName: 'Sign-Out',
    displayName: 'Sign out',
    urlPath: 'sign-out',
    children: [],
  },
  {
    moduleId: 42,
    moduleName: 'Settings',
    displayName: 'Settings',
    urlPath: 'setting',
    children: [],
  },
] as unknown as CommonMenuItem[];

describe('UserMenu', () => {
  let component: UserMenu;
  let fixture: ComponentFixture<UserMenu>;
  let store: InstanceType<typeof AuthStore>;

  const commonMenuApiMock = {
    getCommonMenu: vi.fn((): Observable<CommonMenuResponse> =>
      of({ isSucceeded: true, message: '', errors: [], data: profileMenu }),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [UserMenu],
      providers: [{ provide: CommonMenuApi, useValue: commonMenuApiMock }],
    }).compileComponents();

    store = TestBed.inject(AuthStore);
    fixture = TestBed.createComponent(UserMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the loader in place of the links, with sign-out still available, while the menu is busy', () => {
    TestBed.runInInjectionContext(() => {
      store.setLoginData({ userType: 'Host' } as never);
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(store.isUserMenuLoading()).toBe(true);
    expect(host.querySelector('app-user-menu-loader')).toBeTruthy();
    expect(host.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading menu');
    const labels = [...host.querySelectorAll('ul.py-2 a')].map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Sign out']);
  });

  it('should swap the loader for the menu rows once CommonMenu resolves', async () => {
    TestBed.runInInjectionContext(() => {
      store.setLoginData({ userType: 'Host' } as never);
    });
    await Promise.resolve();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(store.isUserMenuLoading()).toBe(false);
    expect(host.querySelector('app-user-menu-loader')).toBeNull();
    const labels = [...host.querySelectorAll('ul.py-2 a')].map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Profile', 'Sign out']);
  });

  it('should render the migrated two-level CommonMenu quick actions', async () => {
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(
      of({ isSucceeded: true, message: '', errors: [], data: flattenedProfileMenu }),
    );

    TestBed.runInInjectionContext(() => {
      store.setLoginData({ userType: 'Host' } as never);
    });
    await Promise.resolve();
    fixture.detectChanges();

    const labels = [...fixture.nativeElement.querySelectorAll('ul.py-2 a')].map((a) =>
      a.textContent?.trim(),
    );
    expect(labels).toEqual(['Profile', 'Help & Support', 'Settings', 'Sign out']);
  });

  it('should not show the empty state to a non-host user while the menu is busy', () => {
    TestBed.runInInjectionContext(() => {
      store.setLoginData({ userType: 'Employee' } as never);
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(store.isUserMenuLoading()).toBe(true);
    expect(host.textContent).not.toContain('No Quick Actions Available');
    const labels = [...host.querySelectorAll('ul.py-2 a')].map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Sign out']);
  });

  it('should keep sign-out available when CommonMenu fails', async () => {
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(throwError(() => new Error('offline')));

    TestBed.runInInjectionContext(() => {
      store.setLoginData({ userType: 'Employee' } as never);
    });
    await Promise.resolve();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(store.isUserMenuLoading()).toBe(false);
    expect(host.querySelector('app-user-menu-loader')).toBeNull();
    const labels = [...host.querySelectorAll('ul.py-2 a')].map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Sign out']);
  });
});
