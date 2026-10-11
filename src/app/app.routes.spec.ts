import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthApi } from '@core/services/auth-api';

import { routes } from './app.routes';

@Component({ template: '' })
class Stub {}

/** Keeps the real redirect rules, swaps the lazy `/app` tree for a single known page. */
const testRoutes: Routes = routes.map((route) =>
  route.path === 'app'
    ? {
        path: 'app',
        children: [
          { path: 'billing/reconciliation', component: Stub },
          { path: '**', component: Stub, data: { notFound: 'layout' } },
        ],
      }
    : route,
);

describe('app routes', () => {
  let authenticated: boolean;

  beforeEach(() => {
    authenticated = true;
    TestBed.configureTestingModule({
      providers: [
        provideRouter(testRoutes),
        { provide: AuthApi, useValue: { isAuthenticated: () => authenticated } },
      ],
    });
  });

  it('moves a signed-in user from an unprefixed URL to the same page under /app', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/billing/reconciliation?tab=1');

    expect(TestBed.inject(Router).url).toBe('/app/billing/reconciliation?tab=1');
  });

  it('sends a signed-in user on an unknown URL to the in-layout 404', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/no/such/page');

    expect(TestBed.inject(Router).url).toBe('/app/no/such/page');
  });

  it('leaves a signed-out user on the bare 404', async () => {
    authenticated = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/billing/reconciliation');

    expect(TestBed.inject(Router).url).toBe('/billing/reconciliation');
  });
});
