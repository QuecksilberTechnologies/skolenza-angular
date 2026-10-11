import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EmailTemplateApi } from '@core/services';
import { EmailTemplateRow, SettledSearchTerm } from '@shared/interfaces';

import { EMAIL_TEMPLATE_SCOPE, EmailTemplateScope } from './email-template-scope';
import { EmailTemplatesStore } from './email-templates.store';

function createTemplate(overrides: Partial<EmailTemplateRow> = {}): EmailTemplateRow {
  return {
    id: 1,
    templateName: 'Welcome email',
    templateCode: 'WELCOME_EMAIL',
    subject: 'Welcome to Acme',
    body: '<p>Hello there</p>',
    fromEmail: 'no-reply@acme.com',
    fromName: 'Acme HR',
    ccEmail: null,
    bccEmail: null,
    category: 'Onboarding',
    languageCode: 'en',
    isActive: true,
    ...overrides,
  };
}

describe('EmailTemplatesStore', () => {
  const emailTemplateApiMock = {
    getEmailTemplates: vi.fn(),
    setEmailTemplateStatus: vi.fn(),
    deleteEmailTemplate: vi.fn(),
  };

  const createStore = (emailTemplates: EmailTemplateRow[]) => {
    const store = TestBed.inject(EmailTemplatesStore);
    patchState(store as never, { emailTemplates });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    emailTemplateApiMock.getEmailTemplates.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    emailTemplateApiMock.setEmailTemplateStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    emailTemplateApiMock.deleteEmailTemplate.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        EmailTemplatesStore,
        { provide: EmailTemplateApi, useValue: emailTemplateApiMock },
      ],
    });
  });

  it('re-queries with the selected status', async () => {
    const store = TestBed.inject(EmailTemplatesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setIsActive(false);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(emailTemplateApiMock.getEmailTemplates).toHaveBeenLastCalledWith({
      Search: '',
      IsActive: false,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('keeps the rows and total from a successful page', async () => {
    emailTemplateApiMock.getEmailTemplates.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createTemplate({ id: 7 })],
        totalRecords: 42,
      }),
    );

    const store = TestBed.inject(EmailTemplatesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.emailTemplates().map((row) => row.id)).toEqual([7]);
    expect(store.totalRecords()).toBe(42);
  });

  it('sends the requested page back to the API', async () => {
    const store = TestBed.inject(EmailTemplatesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(emailTemplateApiMock.getEmailTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ PageNumber: 3, PageSize: 10 }),
    );
  });

  it('returns to the first page when a filter changes', async () => {
    const store = TestBed.inject(EmailTemplatesStore);
    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    store.setIsActive(true);

    expect(store.pageNumber()).toBe(1);
  });

  it('returns to the first page when the search term changes', async () => {
    const store = TestBed.inject(EmailTemplatesStore);
    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    store.setSearch('welcome' as SettledSearchTerm);

    expect(store.pageNumber()).toBe(1);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createTemplate({ id: 7 })]);
    emailTemplateApiMock.getEmailTemplates.mockReturnValue(throwError(() => new Error('boom')));

    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.emailTemplates()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
    expect(store.isLoading()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the flipped status for the row', () => {
      const store = createStore([createTemplate({ id: 7, isActive: true })]);

      store.toggleActive(store.emailTemplates()[0]);

      expect(emailTemplateApiMock.setEmailTemplateStatus).toHaveBeenCalledWith({
        id: 7,
        isActive: false,
      });
    });

    it('clears the row spinner when the call fails', () => {
      emailTemplateApiMock.setEmailTemplateStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createTemplate({ id: 7, isActive: true })]);

      store.toggleActive(store.emailTemplates()[0]);

      expect(store.emailTemplates()).toEqual([
        expect.objectContaining({ id: 7, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteEmailTemplate', () => {
    it('sends the row id', () => {
      const store = createStore([createTemplate({ id: 7 })]);

      store.deleteEmailTemplate(store.emailTemplates()[0]);

      expect(emailTemplateApiMock.deleteEmailTemplate).toHaveBeenCalledWith(7);
    });

    it('clears the row spinner when the call fails', () => {
      emailTemplateApiMock.deleteEmailTemplate.mockReturnValue(throwError(() => new Error('boom')));
      const store = createStore([createTemplate({ id: 7 })]);

      store.deleteEmailTemplate(store.emailTemplates()[0]);

      expect(store.emailTemplates()).toEqual([
        expect.objectContaining({ id: 7, isDeleting: false }),
      ]);
    });
  });

  describe('syncEmailTemplates', () => {
    const syncMock = vi.fn();

    const useInstitutionScope = () =>
      TestBed.overrideProvider(EMAIL_TEMPLATE_SCOPE, {
        useValue: {
          api: emailTemplateApiMock,
          sync: syncMock,
          listRoute: '/app/institution-email-templates',
          moduleCode: 'INSTITUTION_EMAIL_TEMPLATE',
          pageDescription: '',
          canPerform: () => true,
        } as unknown as EmailTemplateScope,
      });

    it('copies the defaults and reloads the grid', async () => {
      syncMock.mockReturnValue(
        of({ isSucceeded: true, message: 'Synced.', errors: [], data: null }),
      );
      useInstitutionScope();
      const store = TestBed.inject(EmailTemplatesStore);
      await TestBed.inject(ApplicationRef).whenStable();
      emailTemplateApiMock.getEmailTemplates.mockClear();

      store.syncEmailTemplates();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(syncMock).toHaveBeenCalledTimes(1);
      expect(emailTemplateApiMock.getEmailTemplates).toHaveBeenCalledTimes(1);
      expect(store.isSyncing()).toBe(false);
    });

    it('clears the busy flag when the call fails', () => {
      syncMock.mockReturnValue(throwError(() => new Error('boom')));
      useInstitutionScope();
      const store = TestBed.inject(EmailTemplatesStore);

      store.syncEmailTemplates();

      expect(store.isSyncing()).toBe(false);
    });

    it('does nothing in the Host scope, which has no defaults to copy from', () => {
      const store = TestBed.inject(EmailTemplatesStore);

      store.syncEmailTemplates();

      expect(store.isSyncing()).toBe(false);
    });
  });
});
