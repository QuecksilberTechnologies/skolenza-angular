import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { APP_SETTINGS, appSettings } from '@core/app-settings';
import { AuthApi } from '@core/services';
import { AsideMenuStore, FeaturePageStore } from '@core/stores';
import { FeaturePageNode } from '@shared/interfaces';

import AppAsideMenuComponent from './app-aside-menu';
import { ASIDE_MENU_MODULE_UI } from './aside-menu-module-map';
import { ASIDE_MENU_UNMAPPED_MODULES } from './aside-menu-unmapped-modules';

/** Trimmed from the live `/Navigation/my-menu` payload. */
function node(over: Partial<FeaturePageNode>): FeaturePageNode {
  return {
    id: 0,
    moduleCode: '',
    moduleName: '',
    pageName: '',
    displayName: '',
    urlPath: null,
    iconKey: null,
    parentModuleId: null,
    isLeafNode: false,
    moduleScope: 1,
    children: [],
    operations: [],
    ...over,
  };
}

const CATALOG: FeaturePageNode[] = [
  node({
    id: 1,
    moduleCode: 'COMMON_MENU',
    moduleName: 'Common',
    displayName: 'Basic Menu',
    children: [
      node({
        id: 6,
        moduleCode: 'COMMON_PROFILE',
        moduleName: 'Profile',
        displayName: 'Profile',
      }),
    ],
  }),
  node({
    id: 3,
    moduleCode: 'INSTITUTION_MGMT',
    moduleName: 'Institution Management',
    displayName: 'Institution Management',
    children: [
      node({
        id: 25,
        moduleCode: 'INSTITUTION_DEPARTMENTS',
        moduleName: 'Departments',
        displayName: 'Departments',
        isLeafNode: true,
      }),
      node({
        id: 27,
        moduleCode: 'INSTITUTION_ACCESS',
        moduleName: 'Roles & Permissions',
        displayName: 'Roles & Permissions',
        isLeafNode: true,
      }),
    ],
  }),
  node({
    id: 2,
    moduleCode: 'STAFF_MGMT',
    moduleName: 'StaffMember-Management',
    displayName: 'StaffMember Management',
    children: [
      // A profile tab, reached inside `/app/profile` rather than from the menu, so the module map
      // leaves it out on purpose — and takes this parent down with it, since it is the only child.
      node({
        id: 9,
        moduleCode: 'STAFF_OVERVIEW',
        moduleName: 'StaffMember-Overview',
        displayName: 'StaffMember Overview',
        isLeafNode: true,
      }),
    ],
  }),
  node({
    id: 5,
    moduleCode: 'HOST_DEVICE_MGMT',
    moduleName: 'Device Management',
    displayName: 'Device Management',
    moduleScope: 2,
    children: [
      // The `/host/devices` page has no route yet, so this code is absent from the module map and
      // takes its parent down with it — the host-scope twin of `STAFF_MGMT` above.
      node({
        id: 37,
        moduleCode: 'HOST_DEVICE_INVENTORY',
        moduleName: 'Device Inventory',
        displayName: 'Device Inventory',
        moduleScope: 2,
        isLeafNode: true,
      }),
    ],
  }),
  node({
    id: 54,
    moduleCode: 'HOST_DEVICE_SETUP',
    moduleName: 'Device Catalogue',
    displayName: 'Device Catalogue',
    moduleScope: 2,
    isLeafNode: true,
  }),
];

interface Setup {
  roleTypeId?: number;
  nodes?: FeaturePageNode[];
  /** Defaults to true — pass false for the state before any load has resolved. */
  isLoaded?: boolean;
  isLoading?: boolean;
  url?: string;
}

function featurePageStoreStub(nodes: FeaturePageNode[], options: Setup = {}) {
  return {
    nodes: signal(nodes),
    isLoading: signal(options.isLoading ?? false),
    isLoaded: signal(options.isLoaded ?? true),
    hasLoadFailed: signal(false),
    errorMessage: signal<string | null>(null),
    fetchedAt: signal<number | null>(Date.now()),
    hasMenu: signal(nodes.length > 0),
    showSkeleton: signal(false),
    hasError: signal(false),
    load: vi.fn(() => Promise.resolve()),
    ensureLoaded: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve()),
    clear: vi.fn(),
  };
}

async function setup(options: Setup = {}) {
  const featureStore = featurePageStoreStub(options.nodes ?? CATALOG, options);

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [AppAsideMenuComponent],
    providers: [
      MessageService,
      DatePipe,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'app/departments', children: [] },
        { path: 'app/roles', children: [] },
        { path: 'app/staff', children: [] },
        { path: 'app/staff/password-management', children: [] },
        { path: 'app/my-devices/:institutionDeviceId/device-settings', children: [] },
      ]),
      { provide: APP_SETTINGS, useValue: appSettings },
      { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      { provide: FeaturePageStore, useValue: featureStore },
    ],
  }).compileComponents();

  localStorage.clear();
  TestBed.inject(AuthApi).setAuthRoleType(options.roleTypeId ?? 1);
  if (options.url) await TestBed.inject(Router).navigateByUrl(options.url);

  const fixture: ComponentFixture<AppAsideMenuComponent> =
    TestBed.createComponent(AppAsideMenuComponent);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();

  return { fixture, component: fixture.componentInstance, featureStore };
}

/** Flattened `moduleCode`s of the single rendered section. */
function codes(component: AppAsideMenuComponent): string[] {
  const out: string[] = [];
  const walk = (items: { id?: string; children?: unknown[] }[]) => {
    for (const item of items) {
      if (item.id) out.push(item.id);
      if (item.children?.length) walk(item.children as { id?: string }[]);
    }
  };
  component.sections().forEach((s) => walk(s.items));
  return out;
}

describe('AppAsideMenu', () => {
  it('renders one Management section for a institution admin', async () => {
    const { component } = await setup();

    expect(component.sections().map((s) => s.label)).toEqual(['Management']);
  });

  it('excludes the COMMON_MENU subtree', async () => {
    const { component } = await setup();

    expect(codes(component)).not.toContain('COMMON_MENU');
    expect(codes(component)).not.toContain('COMMON_PROFILE');
  });

  // The two codes the fixtures below lean on have to stay out of the module map for those tests to
  // mean anything, so they are asserted against the registry rather than trusted.
  it('leans on codes the module map deliberately omits', () => {
    expect(Object.keys(ASIDE_MENU_UNMAPPED_MODULES)).toEqual(
      expect.arrayContaining(['STAFF_OVERVIEW', 'HOST_DEVICE_INVENTORY']),
    );
  });

  it('drops a module code that has no entry in the module map', async () => {
    const { component } = await setup();

    expect(codes(component)).toContain('INSTITUTION_DEPARTMENTS');
    expect(codes(component)).not.toContain('STAFF_OVERVIEW');
  });

  it('shows only host-scope roots for a host session', async () => {
    const { component } = await setup({ roleTypeId: 0 });

    // `HOST_DEVICE_MGMT` goes with its only child, which the module map does not name.
    expect(codes(component)).toEqual(['HOST_DEVICE_SETUP']);
  });

  it('collapses a header onto its only mapped child instead of nesting it', async () => {
    const { component } = await setup({
      nodes: [
        node({
          id: 60,
          moduleCode: 'INSTITUTION_DASHBOARD',
          moduleName: 'Dashboard',
          displayName: 'Dashboard',
          children: [
            node({
              id: 61,
              moduleCode: 'INSTITUTION_DASHBOARD_OVERVIEW',
              moduleName: 'Overview',
              displayName: 'Overview',
              isLeafNode: true,
            }),
          ],
        }),
      ],
    });

    const items = component.sections()[0].items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'INSTITUTION_DASHBOARD_OVERVIEW', route: 'admin-dashboard' });
    expect(items[0].children).toBeUndefined();
  });

  it('keeps a routed parent reachable as the first entry of its own group', async () => {
    const { component } = await setup({
      nodes: [
        node({
          id: 46,
          moduleCode: 'INSTITUTION_EMAIL_CONFIG',
          moduleName: 'Email Delivery Settings',
          displayName: 'Email Settings',
          isLeafNode: true,
          children: [
            node({
              id: 119,
              moduleCode: 'INSTITUTION_EMAIL_TEMPLATE',
              moduleName: 'Institution Email Templates',
              displayName: 'Email Templates',
              parentModuleId: 46,
              isLeafNode: true,
            }),
          ],
        }),
      ],
    });

    const [group] = component.sections()[0].items;
    expect(group).toMatchObject({ id: 'INSTITUTION_EMAIL_CONFIG_GROUP', label: 'Email Settings' });
    expect(group.route).toBeUndefined();
    expect(group.children).toEqual([
      expect.objectContaining({ id: 'INSTITUTION_EMAIL_CONFIG', route: 'institution-email-config' }),
      expect.objectContaining({ id: 'INSTITUTION_EMAIL_TEMPLATE', route: 'institution-email-templates' }),
    ]);
  });

  it('renders a collapsed leaf under the label the module map names for it', async () => {
    const { component } = await setup({
      nodes: [
        node({
          id: 60,
          moduleCode: 'INSTITUTION_DASHBOARD',
          moduleName: 'Dashboard',
          displayName: 'Dashboard',
          children: [
            node({
              id: 61,
              moduleCode: 'INSTITUTION_DASHBOARD_OVERVIEW',
              moduleName: 'Overview',
              displayName: 'Overview',
              isLeafNode: true,
            }),
          ],
        }),
      ],
    });

    // 'Overview' alone says nothing in a flat sidebar, and sorts under the wrong letter.
    expect(component.sections()[0].items[0]).toMatchObject({
      label: 'Dashboard',
      tooltip: 'Dashboard',
    });
  });

  it('drops a header whose every child is unmapped', async () => {
    const { component } = await setup({
      nodes: [
        node({
          id: 2,
          moduleCode: 'STAFF_MGMT',
          moduleName: 'StaffMember-Management',
          displayName: 'StaffMember Management',
          children: [
            node({
              id: 9,
              moduleCode: 'STAFF_OVERVIEW',
              moduleName: 'StaffMember-Overview',
              displayName: 'StaffMember Overview',
              isLeafNode: true,
            }),
          ],
        }),
      ],
    });

    expect(codes(component)).not.toContain('STAFF_MGMT');
  });

  it('renders the retry control instead of the empty state on a cold failure', async () => {
    const { fixture, featureStore } = await setup({ nodes: [] });
    featureStore.hasError.set(true);
    featureStore.errorMessage.set('Could not load the menu.');
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    // A cold failure leaves `showSkeleton` false and `visibleSections` empty, so without the
    // `!menuError()` term the sections branch wins and this control is unreachable.
    expect(text).toContain('Could not load the menu.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('No menu items found.');

    fixture.nativeElement.querySelector('button')?.click();

    expect(featureStore.refresh).toHaveBeenCalled();
  });

  it('shows the loader, not the empty state, before the first load resolves', async () => {
    const { fixture } = await setup({ nodes: [], isLoaded: false });

    const text: string = fixture.nativeElement.textContent;
    // `showSkeleton` is false here too — nothing has been requested yet — which is exactly why the
    // template gates on `isLoaded` instead.
    expect(text).not.toContain('Your menu is empty.');
    expect(text).not.toContain('Try again');
    expect(fixture.nativeElement.querySelector('app-aside-menu-loader')).toBeTruthy();
  });

  it('swaps the empty state for the loader while a retry is in flight', async () => {
    const { fixture } = await setup({ nodes: [], isLoading: true });

    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain('Try again');
    expect(fixture.nativeElement.querySelector('app-aside-menu-loader')).toBeTruthy();
  });

  it('offers a retry when the tree itself is empty', async () => {
    const { fixture, featureStore } = await setup({ nodes: [] });

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Your menu is empty.');
    expect(text).toContain('Try again');

    fixture.nativeElement.querySelector('button')?.click();

    expect(featureStore.refresh).toHaveBeenCalled();
  });

  it('offers no retry when a search is what emptied the list', async () => {
    const { fixture, component } = await setup();

    component.onSearch('nothing matches this');
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('No menu items found.');
    expect(text).not.toContain('Try again');
  });

  it('retryMenu asks the store to refresh', async () => {
    const { component, featureStore } = await setup();

    component.retryMenu();

    expect(featureStore.refresh).toHaveBeenCalled();
  });
});

describe('AppAsideMenu active route', () => {
  const DEVICES = [
    node({
      id: 61,
      moduleCode: 'INSTITUTION_DEVICE_SETUP',
      moduleName: 'Installed Devices',
      displayName: 'Installed Devices',
      isLeafNode: true,
    }),
  ];

  const STAFF = [
    node({
      id: 2,
      moduleCode: 'STAFF_MGMT',
      moduleName: 'Staff Management',
      displayName: 'Staff Management',
      children: [
        node({
          id: 7,
          moduleCode: 'STAFF_DIRECTORY',
          moduleName: 'Staff',
          displayName: 'Staff',
          isLeafNode: true,
        }),
        node({
          id: 8,
          moduleCode: 'EMP_PASSWORD_MANAGEMENT',
          moduleName: 'Password Management',
          displayName: 'Password Management',
          isLeafNode: true,
        }),
      ],
    }),
  ];

  it('keeps a leaf active on a child page of its own route', async () => {
    const { component } = await setup({
      nodes: DEVICES,
      url: '/app/my-devices/0EQY4NDX/device-settings',
    });

    expect(component.activeRoute()).toBe('my-devices');
  });

  it('gives a nested route to the deeper leaf, not its prefix sibling', async () => {
    const { component } = await setup({
      nodes: STAFF,
      url: '/app/staff/password-management',
    });

    expect(component.activeRoute()).toBe('staff/password-management');
  });

  it('activates nothing when no menu route owns the url', async () => {
    const { component } = await setup({ nodes: DEVICES, url: '/app/roles' });

    expect(component.activeRoute()).toBe('');
  });
});

describe('AppAsideMenu auto-expand', () => {
  it('expands the ancestors of the active route', async () => {
    await setup({ url: '/app/departments' });

    expect(TestBed.inject(AsideMenuStore).expandedIds()).toContain('INSTITUTION_MGMT');
  });

  it('leaves a manually collapsed ancestor collapsed', async () => {
    await setup({ url: '/app/departments' });
    const store = TestBed.inject(AsideMenuStore);

    store.toggleExpand('INSTITUTION_MGMT', ['INSTITUTION_MGMT']);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.expandedIds()).toEqual([]);
  });
});


