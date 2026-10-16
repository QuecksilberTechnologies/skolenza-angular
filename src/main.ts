import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

if (isDevMode()) {
  console.info(
    `[env] ${environment.production ? 'production' : 'development'}`,
    environment.apiUrl,
  );
}

if (environment.sentryDsn) {
  import('@sentry/angular').then(({ init }) => {
    init({
      dsn: environment.sentryDsn,
      environment: environment.production ? 'production' : 'development',
      // HRMS payloads are PII-heavy: no request/response bodies, no cookies, no locals.
      // v11 stopped scrubbing headers by default; the deny lists restore the v10 PII baseline.
      dataCollection: {
        userInfo: false,
        httpBodies: [],
        cookies: false,
        stackFrameVariables: false,
        httpHeaders: {
          request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
          response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        },
        urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      },
    });
  });
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
