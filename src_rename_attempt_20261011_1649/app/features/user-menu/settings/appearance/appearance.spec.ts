import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CurrentUserPermissionsStore } from '@core/stores';
import { ACCENT_COLORS, QUICK_ACCENT_COLORS } from '@shared/interfaces';

import { SettingsStore } from '../settings.store';
import Appearance from './appearance';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('Appearance', () => {
  let component: Appearance;
  let fixture: ComponentFixture<Appearance>;
  let store: InstanceType<typeof SettingsStore>;

  const swatchCount = () =>
    (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[aria-label="Accent color"] [role="radio"]',
    ).length;

  const hasAccentSection = () =>
    !!(fixture.nativeElement as HTMLElement).querySelector('[aria-label="Accent color"]');

  const hasInterfaceModeSection = () =>
    !!(fixture.nativeElement as HTMLElement).querySelector('[aria-label="Interface mode"]');

  async function setup(isSuperAdmin: boolean) {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [Appearance],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingsStore,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
        {
          provide: CurrentUserPermissionsStore,
          useValue: { isSuperAdmin: () => isSuperAdmin },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Appearance);
    component = fixture.componentInstance;
    store = TestBed.inject(SettingsStore);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup(true);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only the quick colors when the accent is one of them', () => {
    store.updateAppearance({ accentColor: QUICK_ACCENT_COLORS[0].value });
    fixture.detectChanges();

    expect(component.appliedColor()).toBeNull();
    expect(swatchCount()).toBe(QUICK_ACCENT_COLORS.length);
  });

  it('appends the applied color when it is outside the quick colors', () => {
    const extended = ACCENT_COLORS.find(
      (color) => !QUICK_ACCENT_COLORS.some((quick) => quick.value === color.value),
    )!;

    store.updateAppearance({ accentColor: extended.value });
    fixture.detectChanges();

    expect(component.appliedColor()).toBe(extended.value);
    expect(swatchCount()).toBe(QUICK_ACCENT_COLORS.length + 1);
  });

  it('hides the accent color section from a non-super-admin', async () => {
    await setup(false);

    expect(hasAccentSection()).toBe(false);
    // Interface Mode is a personal preference and must stay available to everyone.
    expect(hasInterfaceModeSection()).toBe(true);
  });

  it('shows the accent color section to a super admin', () => {
    expect(hasAccentSection()).toBe(true);
    expect(hasInterfaceModeSection()).toBe(true);
  });
});
