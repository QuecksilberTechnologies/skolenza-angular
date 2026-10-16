import { DatePipe } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  ErrorHandler,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withNavigationErrorHandler,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { provideOptimus } from '@openng/optimus-ui/config';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import { APP_SETTINGS, appSettings } from '@core/app-settings';
import {
  authInterceptor,
  errorInterceptor,
  loadingInterceptor,
  moduleOperationInterceptor,
  unavailableRouteInterceptor,
} from '@core/interceptors';
import { initializeRouteProgress } from '@core/interceptors/route-progress.initializer';
import { GlobalErrorHandler } from '@core/services/global-error-handler';
import { navigationErrorHandler } from '@core/services/navigation-error-handler';
import { BrandTitleStrategy } from '@core/strategies';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled', // restores on back/forward
        anchorScrolling: 'enabled', // #id anchors
      }),
      // Resolve with `false` instead of rejecting, so a failed navigation is a value callers can
      // branch on rather than an unhandled rejection that only reaches GlobalErrorHandler.
      withRouterConfig({ resolveNavigationPromiseOnError: true }),
      withNavigationErrorHandler(navigationErrorHandler),
    ),
    // `unavailableRouteInterceptor` runs outermost: a route the deployment does not serve is
    // failed before it costs an auth header, a spinner or a module-id lookup.
    // `moduleOperationInterceptor` runs innermost: the request it may park on the module catalog
    // is already inside the loading spinner, and `authInterceptor`'s 401 retry re-sends the
    // original request, so the ids are resolved fresh instead of re-applied.
    provideHttpClient(
      withInterceptors([
        unavailableRouteInterceptor,
        errorInterceptor,
        authInterceptor,
        loadingInterceptor,
        moduleOperationInterceptor,
      ]),
    ),
    provideEnvironmentInitializer(() => {
      initializeRouteProgress();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideOptimus({
      theme: {
        options: {
          prefix: 'p',
          darkModeSelector: '.dark',
          cssLayer: false,
        },
      },
    }),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './i18n/', suffix: '.json' }),
      // fallbackLang: 'en',
    }),
    { provide: APP_SETTINGS, useValue: appSettings },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'INR' },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: TitleStrategy, useClass: BrandTitleStrategy },
    MessageService,
    DialogService,
    ConfirmationService,

    // 💡 FIX: Explicitly provide DatePipe for global use in services
    DatePipe,
  ],
};
