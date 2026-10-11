import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';

import HelpSupport, { splitMatches } from './help-support';

describe('splitMatches', () => {
  it('flags every case-insensitive match', () => {
    expect(splitMatches('Leave and leave', 'leave')).toEqual([
      { text: 'Leave', match: true },
      { text: ' and ', match: false },
      { text: 'leave', match: true },
    ]);
  });

  it('returns the whole text when there is no term', () => {
    expect(splitMatches('Payroll', '')).toEqual([{ text: 'Payroll', match: false }]);
  });
});

describe('HelpSupport', () => {
  let harness: RouterTestingHarness;
  const commonMock = { setPageHeaderInfo: vi.fn() };
  const roleTypeId = signal<number | undefined>(2);

  const el = () => harness.routeNativeElement as HTMLElement;
  const headings = () =>
    [...el().querySelectorAll('#faq-results h2')].map((h) => h.textContent?.trim());
  const questions = () => [...el().querySelectorAll('summary')].map((s) => s.textContent?.trim());
  const input = () => el().querySelector('input[type="search"]') as HTMLInputElement;
  const button = (text: string) =>
    [...el().querySelectorAll('button')].find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;

  async function open(url = '/app/help-support') {
    harness = await RouterTestingHarness.create(url);
  }

  async function search(term: string) {
    input().value = term;
    input().dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }

  beforeEach(() => {
    commonMock.setPageHeaderInfo.mockClear();
    roleTypeId.set(2);
    Element.prototype.scrollIntoView = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'app/help-support', component: HelpSupport }]),
        { provide: Common, useValue: commonMock },
        { provide: AuthStore, useValue: { roleTypeId } },
      ],
    });
  });

  it('sets the page header', async () => {
    await open();

    expect(commonMock.setPageHeaderInfo).toHaveBeenCalledWith(
      expect.objectContaining({ pageTitle: 'Help & Support' }),
    );
  });

  it('shows an staffMember the staff topics only', async () => {
    await open();

    expect(headings()).toContain('Leave');
    expect(headings()).toContain('Access & permissions');
    expect(headings()).not.toContain('Administration');
    expect(headings()).not.toContain('Institutions & plans');
  });

  it('shows a host the account and platform topics only', async () => {
    roleTypeId.set(0);
    await open();

    expect(headings()).toEqual(['Account & sign-in', 'Institutions & plans']);
  });

  it('filters, opens and highlights matches', async () => {
    await open();
    await search('payslip');

    expect(questions()).toEqual(['Where can I download my payslip?']);
    expect(el().querySelector('details')?.open).toBe(true);
    expect(el().querySelector('summary mark')?.textContent).toBe('payslip');
  });

  it('filters by topic', async () => {
    await open();
    button('Payroll').click();
    await harness.fixture.whenStable();

    expect(headings()).toEqual(['Payroll']);
    expect(button('Payroll').getAttribute('aria-pressed')).toBe('true');
  });

  it('shows an empty state that resets back to every question', async () => {
    await open();
    await search('zzz-no-match');

    expect(questions()).toHaveLength(0);
    expect(el().textContent).toContain('No questions match "zzz-no-match"');

    button('Show all questions').click();
    await harness.fixture.whenStable();

    expect(input().value).toBe('');
    expect(questions().length).toBeGreaterThan(0);
  });

  it('clears the search with the clear button', async () => {
    await open();
    await search('leave');
    (el().querySelector('[aria-label="Clear search"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();

    expect(input().value).toBe('');
    expect(document.activeElement).toBe(input());
  });

  it('focuses search on "/"', async () => {
    await open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

    expect(document.activeElement).toBe(input());
  });

  it('opens and scrolls to the question named in the fragment', async () => {
    await open('/app/help-support#payslip');

    const target = el().querySelector('#faq-q-payslip') as HTMLDetailsElement;
    expect(target.open).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('links answers to their page', async () => {
    await open();

    const link = el().querySelector('#faq-q-apply-leave a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app/leave');
  });

  it('links to support by email', async () => {
    await open();

    const link = el().querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('mailto:support@skolenza.in');
  });
});
