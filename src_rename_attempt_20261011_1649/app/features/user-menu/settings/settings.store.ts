import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { TranslateService } from '@ngx-translate/core';
import { palette, updatePreset } from '@openng/optimus-ui-themes';

import { StorageApi, InstitutionsApi, ThemeApi } from '@core/services';
import { AuthStore } from '@core/stores';
import {
  ACCENT_COLORS,
  AppearanceData,
  BrandIdentityData,
  LanguageRegionData,
  LogoVariantKey,
  MOCK_SETTINGS,
  NotificationsData,
  SettingsData,
} from '@shared/interfaces';

const LANGUAGE_STORAGE_KEY = 'app-language';

interface LogoPreviewState {
  preview: string | null;
  fileName: string | null;
}

interface SettingsState {
  settings: SettingsData;
  savedSettings: SettingsData;
  isLoading: boolean;
  logoPreviews: Record<LogoVariantKey, LogoPreviewState>;
}

function revokeIfBlob(url: string | null): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

const emptyLogoPreviews: Record<LogoVariantKey, LogoPreviewState> = {
  darkSmall: { preview: null, fileName: null },
  darkLarge: { preview: null, fileName: null },
  lightSmall: { preview: null, fileName: null },
  lightLarge: { preview: null, fileName: null },
  favicon: { preview: null, fileName: null },
};

const initialState: SettingsState = {
  settings: MOCK_SETTINGS,
  savedSettings: MOCK_SETTINGS,
  isLoading: false,
  logoPreviews: emptyLogoPreviews,
};

export const SettingsStore = signalStore(
  withState(initialState),
  withComputed(({ settings, savedSettings }) => ({
    brandIdentity: computed(() => settings().brandIdentity),
    appearance: computed(() => settings().appearance),
    languageRegion: computed(() => settings().languageRegion),
    notifications: computed(() => settings().notifications),
    isDirty: computed(() => JSON.stringify(settings()) !== JSON.stringify(savedSettings())),
    selectedColorName: computed(() => {
      const color = ACCENT_COLORS.find((c) => c.value === settings().appearance.accentColor);
      return color?.name ?? 'Custom';
    }),
  })),
  withMethods((store) => {
    const storageApi = inject(StorageApi);
    const themeApi = inject(ThemeApi);
    const institutionsApi = inject(InstitutionsApi);
    const translateService = inject(TranslateService);

    return {
      updateBrandIdentity(data: Partial<BrandIdentityData>): void {
        patchState(store, {
          settings: {
            ...store.settings(),
            brandIdentity: { ...store.settings().brandIdentity, ...data },
          },
        });
      },

      updateAppearance(data: Partial<AppearanceData>): void {
        const updated = { ...store.settings().appearance, ...data };
        patchState(store, {
          settings: { ...store.settings(), appearance: updated },
        });
      },

      setAccentColor(hex: string): void {
        const primaryColor = palette(hex);
        updatePreset({ semantic: { primary: primaryColor } });
        institutionsApi.cacheBrandColor(hex);
        patchState(store, {
          settings: {
            ...store.settings(),
            appearance: { ...store.settings().appearance, accentColor: hex },
          },
        });
      },

      setThemeMode(mode: 'light' | 'dark'): void {
        const currentlyDark = themeApi.isDarkMode();
        if ((mode === 'dark' && !currentlyDark) || (mode === 'light' && currentlyDark)) {
          themeApi.toggleThemeMode();
          themeApi.setTheme(mode);
        }
        patchState(store, {
          settings: {
            ...store.settings(),
            appearance: { ...store.settings().appearance, themeMode: mode },
          },
        });
      },

      updateLanguageRegion(data: Partial<LanguageRegionData>): void {
        patchState(store, {
          settings: {
            ...store.settings(),
            languageRegion: { ...store.settings().languageRegion, ...data },
          },
        });

        if (data.language) {
          const baseCode = data.language.split('-')[0];
          translateService.use(baseCode);
          localStorage.setItem(storageApi.prefixKey(LANGUAGE_STORAGE_KEY), data.language);
        }
      },

      updateNotifications(data: Partial<NotificationsData>): void {
        patchState(store, {
          settings: {
            ...store.settings(),
            notifications: { ...store.settings().notifications, ...data },
          },
        });
      },

      setLogoPreview(
        variant: LogoVariantKey,
        preview: string | null,
        fileName: string | null,
      ): void {
        revokeIfBlob(store.logoPreviews()[variant].preview);
        patchState(store, {
          logoPreviews: {
            ...store.logoPreviews(),
            [variant]: { preview, fileName },
          },
        });
      },

      applyBrandLogo(variant: LogoVariantKey, url: string | null): void {
        institutionsApi.setBrandLogo(variant, url);
      },

      saveSettings(): void {
        patchState(store, { savedSettings: store.settings() });
      },

      discardChanges(): void {
        const saved = store.savedSettings();
        Object.values(store.logoPreviews()).forEach((p) => revokeIfBlob(p.preview));
        institutionsApi.clearBrandLogos();
        patchState(store, { settings: saved, logoPreviews: emptyLogoPreviews });

        // Restore theme and color
        const primaryColor = palette(saved.appearance.accentColor);
        updatePreset({ semantic: { primary: primaryColor } });
        institutionsApi.cacheBrandColor(saved.appearance.accentColor);

        const currentlyDark = themeApi.isDarkMode();
        const shouldBeDark = saved.appearance.themeMode === 'dark';
        if (currentlyDark !== shouldBeDark) {
          themeApi.toggleThemeMode();
          themeApi.setTheme(saved.appearance.themeMode);
        }

        // Restore language
        const baseCode = saved.languageRegion.language.split('-')[0];
        translateService.use(baseCode);
        localStorage.setItem(
          storageApi.prefixKey(LANGUAGE_STORAGE_KEY),
          saved.languageRegion.language,
        );
      },
    };
  }),
  withHooks({
    async onInit(store) {
      const storageApi = inject(StorageApi);
      const authStore = inject(AuthStore);
      const institutionsApi = inject(InstitutionsApi);
      const themeApi = inject(ThemeApi);
      const translateService = inject(TranslateService);

      const brandColor = await institutionsApi.getBrandColor();
      const themeMode = themeApi.isDarkMode() ? ('dark' as const) : ('light' as const);
      const institutionName = authStore.institutionName();

      // Hydrate logo preview slots from persisted brand logos
      await institutionsApi.loadBrandLogos();
      const cachedLogos = institutionsApi.brandLogos();
      const logoPreviews: Record<LogoVariantKey, LogoPreviewState> = { ...emptyLogoPreviews };
      (Object.keys(cachedLogos) as LogoVariantKey[]).forEach((key) => {
        const url = cachedLogos[key];
        if (url) logoPreviews[key] = { preview: url, fileName: null };
      });

      // Read cached language, fall back to TranslateService current lang
      const cachedLang = localStorage.getItem(storageApi.prefixKey(LANGUAGE_STORAGE_KEY));
      let mappedLang: string;
      if (cachedLang) {
        mappedLang = cachedLang;
        const baseCode = cachedLang.split('-')[0];
        translateService.use(baseCode);
      } else {
        const currentLang =
          translateService.currentLang() ?? translateService.getFallbackLang() ?? 'en';
        const langMapping: Record<string, string> = {
          en: 'en-US',
          es: 'es',
          fr: 'fr',
          de: 'de',
          hi: 'hi',
          zh: 'zh',
          ar: 'ar',
          pt: 'pt',
          ja: 'ja',
        };
        mappedLang = langMapping[currentLang] ?? 'en-US';
      }

      const appearance = brandColor
        ? { accentColor: brandColor, themeMode }
        : { ...store.settings().appearance, themeMode };

      const brandIdentity = institutionName
        ? { ...store.settings().brandIdentity, organizationName: institutionName }
        : store.settings().brandIdentity;

      patchState(store, {
        logoPreviews,
        settings: {
          ...store.settings(),
          brandIdentity,
          appearance,
          languageRegion: { ...store.settings().languageRegion, language: mappedLang },
        },
        savedSettings: {
          ...store.savedSettings(),
          brandIdentity,
          appearance,
          languageRegion: { ...store.savedSettings().languageRegion, language: mappedLang },
        },
      });
    },
  }),
);
