import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';

import Settings from './settings';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;

  async function setup(
    options: { isSuperAdmin: boolean; roleTypeId?: number; url?: string } = {
      isSuperAdmin: true,
    },
  ) {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        {
          provide: CurrentUserPermissionsStore,
          useValue: { isSuperAdmin: () => options.isSuperAdmin },
        },
        {
          provide: AuthApi,
          useValue: { authRoleType: () => options.roleTypeId ?? 2 },
        },
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockResolvedValue(true),
            events: of(),
            url: options.url ?? '/app/setting/brand-identity',
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const tabRoutes = () => component.tabs().map((tab) => tab.route);

  beforeEach(async () => {
    await setup();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows every org-wide tab to a super admin', () => {
    expect(tabRoutes()).toEqual([
      'brand-identity',
      'appearance',
      'language-region',
      'notifications',
      'staffMember-editing',
    ]);
  });

  it('leaves a non-super-admin only the personal tab', async () => {
    await setup({ isSuperAdmin: false });

    expect(tabRoutes()).toEqual(['appearance']);
  });

  it('still appends billing for an admin, super admin or not', async () => {
    await setup({ isSuperAdmin: false, roleTypeId: 1 });

    expect(tabRoutes()).toEqual(['appearance', 'billing']);
  });

  it('falls back to a visible tab when the URL points at a hidden one', async () => {
    await setup({ isSuperAdmin: false, url: '/app/setting/brand-identity' });

    expect(component.activeTab()).toBe('appearance');
  });

  it('keeps the URL tab highlighted when the user may see it', () => {
    expect(component.activeTab()).toBe('brand-identity');
  });
});
