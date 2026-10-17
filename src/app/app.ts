import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';
import { palette, updatePreset, usePreset } from '@openng/optimus-ui-themes';
import { Optimus } from '@openng/optimus-ui/config';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { ToastModule } from '@openng/optimus-ui/toast';

import { FaviconApi } from '@core/services/favicon-api';
import { InstitutionsApi } from '@core/services/institutions-api';
import { LoadingStore } from '@core/services/loading-store';
import { StorageApi } from '@core/services/storage-api';
import { ThemeApi } from '@core/services/theme-api';
import { accessiblePrimaryStop } from '@shared/utilities/color';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ProgressBarModule],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  readonly #storageApi = inject(StorageApi);
  readonly #themeApi = inject(ThemeApi);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #dialogService = inject(DialogService);
  readonly #updates = inject(SwUpdate);
  readonly #destroyRef = inject(DestroyRef);
  readonly #optimus = inject(Optimus);
  readonly #translateService = inject(TranslateService);
  readonly #loadingStore = inject(LoadingStore);
  readonly loading = this.#loadingStore.loading;

  constructor() {
    inject(FaviconApi); // instantiate so it applies the persisted favicon to the tab
    this.initTheme();
    this.initLanguage();
    this.initVersionUpdates();
  }

  initLanguage() {
    this.#translateService.setFallbackLang('en');
    const cached = localStorage.getItem(this.#storageApi.prefixKey('app-language'));
    if (cached) {
      const baseCode = cached.split('-')[0];
      this.#translateService.use(baseCode);
    } else {
      this.#translateService.use('en');
    }
  }

  initTheme() {
    const theme = this.#themeApi.getTheme();
    if (theme) {
      this.#themeApi.setTheme(theme);
      this.#themeApi.setDarkMode(theme !== 'light');
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemTheme = prefersDark ? 'dark' : 'light';
    this.#themeApi.setTheme(systemTheme);
    this.#themeApi.setDarkMode(prefersDark);
  }

  initVersionUpdates() {
    this.#updates.versionUpdates.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((evt) => {
      if (evt.type !== 'VERSION_READY') return;
      this.#promptVersionUpdate(evt);
    });
  }

  async #promptVersionUpdate(evt: VersionReadyEvent) {
    console.info(`👉Current app version: ${evt.currentVersion.hash}`);
    console.info(`✅New app version ready for use: ${evt.latestVersion.hash}`);

    const { default: VersionUpdateDialogComponent } =
      await import('@shared/components/version-update-dialog/version-update-dialog');

    const dialogRef = this.#dialogService.open(VersionUpdateDialogComponent, {
      header: '✨Update Available',
      modal: true,
      width: '38rem',
      closable: false,
    });

    dialogRef?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => location.reload());

    this.#destroyRef.onDestroy(() => dialogRef?.close());
  }

  async ngOnInit() {
    const { SkolenzaPreset } = await import('@core/skolenza-preset');
    usePreset(SkolenzaPreset);
    await this.#applyBrandColor();
    this.#optimus.ripple.set(true);
  }

  async #applyBrandColor() {
    const brandColor = (await this.#institutionsApi.getBrandColor()) ?? '#4287f5';
    const ramp = palette(brandColor) as Record<number, string>;
    // Light theme: back every primary fill with a stop white text can sit on (dark keeps 400).
    const stop = accessiblePrimaryStop(ramp);
    // A light brand falls back to stop 800, where `stop + 200` would name a stop the ramp lacks.
    const activeStop = Math.min(stop + 200, 950);
    updatePreset({
      semantic: {
        primary: ramp,
        colorScheme: {
          light: {
            primary: {
              color: `{primary.${stop}}`,
              hoverColor: `{primary.${stop + 100}}`,
              activeColor: `{primary.${activeStop}}`,
            },
          },
        },
      },
    });
  }
}
