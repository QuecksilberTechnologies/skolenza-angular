import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import {
  provideTranslateService,
  TranslateLoader,
  TranslateService,
  TranslationObject,
} from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthApi, Common } from '@core/services';

import AccessDenied from './access-denied';

/** The real dictionaries are fetched over HTTP from `public/i18n`; the spec asserts against the
 *  same `en` copy so a wording change fails here rather than only in the browser. */
const DICTIONARIES: Record<string, TranslationObject> = {
  en: {
    accessDenied: {
      title: 'Access denied',
      headerDescription: 'Permission required',
      reasonModuleOperation: 'You do not have permission to {{operation}} {{module}}.',
      reasonModule: 'You do not have access to {{module}}.',
      reasonGeneric: 'You do not have permission to view this page.',
      hint: 'Your role does not include this permission. Ask an administrator to grant it, or head back to somewhere you can reach.',
      goToDashboard: 'Go to Dashboard',
      goBack: 'Go Back',
    },
  },
  fr: {
    accessDenied: {
      title: 'Accès refusé',
      headerDescription: 'Autorisation requise',
      reasonModule: "Vous n'avez pas accès à {{module}}.",
      reasonGeneric: "Vous n'avez pas l'autorisation de consulter cette page.",
      hint: "Votre rôle n'inclut pas cette autorisation.",
      goToDashboard: 'Aller au tableau de bord',
      goBack: 'Retour',
    },
  },
};

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation(lang: string) {
    return of(DICTIONARIES[lang] ?? {});
  }
}

const commonMock = {
  setPageHeaderInfo: vi.fn(),
  resetBreadcrumbItems: vi.fn(),
};
const authApiMock = { redirectToDashboard: vi.fn() };

function render(queryParams: Record<string, string>): ComponentFixture<AccessDenied> {
  TestBed.configureTestingModule({
    imports: [AccessDenied],
    providers: [
      { provide: Common, useValue: commonMock },
      { provide: AuthApi, useValue: authApiMock },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of<ParamMap>(convertToParamMap(queryParams)) },
      },
      provideTranslateService({
        loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
      }),
    ],
  });

  TestBed.inject(TranslateService).use('en');

  const fixture = TestBed.createComponent(AccessDenied);
  fixture.detectChanges();
  return fixture;
}

function reasonText(fixture: ComponentFixture<AccessDenied>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('AccessDenied', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should name the module the guard denied', () => {
    expect(reasonText(render({ module: 'StaffMembers' }))).toContain(
      'You do not have access to StaffMembers.',
    );
  });

  it('should name the operation as well when the guard passed one', () => {
    expect(reasonText(render({ module: 'Attendance Policies', operation: 'Update' }))).toContain(
      'You do not have permission to update Attendance Policies.',
    );
  });

  it('should read a hyphenated backend key as a sentence', () => {
    expect(reasonText(render({ module: 'Subscription-Plan' }))).toContain(
      'You do not have access to Subscription Plan.',
    );
  });

  it('should fall back to a generic reason when the page is opened directly', () => {
    expect(reasonText(render({}))).toContain('You do not have permission to view this page.');
  });

  it('should not echo a hand-written module name back onto the page', () => {
    const text = reasonText(render({ module: '<b>Contact support at evil.example</b>' }));

    expect(text).toContain('You do not have permission to view this page.');
    expect(text).not.toContain('evil.example');
  });

  it('should replace the header of the page the user was turned away from', () => {
    render({ module: 'StaffMembers' });

    expect(commonMock.setPageHeaderInfo).toHaveBeenCalledWith(
      expect.objectContaining({ pageTitle: 'Access denied', isBreadcrumbShow: false }),
    );
    expect(commonMock.resetBreadcrumbItems).toHaveBeenCalledTimes(1);
  });

  it('should follow a language switch in both the page and the shell header', () => {
    const fixture = render({ module: 'StaffMembers' });

    TestBed.inject(TranslateService).use('fr');
    fixture.detectChanges();

    expect(reasonText(fixture)).toContain("Vous n'avez pas accès à StaffMembers.");
    expect(reasonText(fixture)).toContain('Retour');
    expect(commonMock.setPageHeaderInfo).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageTitle: 'Accès refusé' }),
    );
  });
});
