import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { HOST_MODULE } from '@core/host-modules';
import { EmailTemplateApi, InstitutionEmailTemplateApi } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { EmailTemplateMutationRes } from '@shared/interfaces';

export type EmailTemplateOperation = 'Add' | 'Update' | 'Delete';

/** The CRUD routes `/EmailTemplate` and `/InstitutionEmailTemplate` share, so either API class fits. */
export type EmailTemplateCrudApi = Pick<
  EmailTemplateApi,
  | 'getEmailTemplates'
  | 'getEmailTemplate'
  | 'addEmailTemplate'
  | 'updateEmailTemplate'
  | 'setEmailTemplateStatus'
  | 'deleteEmailTemplate'
>;

/**
 * What differs between the Host catalog and a Institution's own copy of it. The screens in this folder
 * serve both; the route that loads them says which through {@link EMAIL_TEMPLATE_SCOPE}.
 */
export interface EmailTemplateScope {
  api: EmailTemplateCrudApi;
  /** Copies the Host defaults into the Institution catalog. `null` where there is nothing to copy from. */
  sync: (() => Observable<EmailTemplateMutationRes>) | null;
  listRoute: string;
  /** `my-menu`'s code for the leaf, used only to source the page title. */
  moduleCode: string;
  pageDescription: string;
  /** Reads signals, so call it inside a `computed`. */
  canPerform: (operation: EmailTemplateOperation) => boolean;
}

export const hostEmailTemplateScope = (): EmailTemplateScope => {
  const permissionsStore = inject(CurrentUserPermissionsStore);

  return {
    api: inject(EmailTemplateApi),
    sync: null,
    listRoute: '/app/email-templates',
    moduleCode: 'HOST_EMAIL_TEMPLATE',
    pageDescription: 'Manage the wording the platform sends for each event',
    // The template catalog has no module of its own - it rides the parent `Host` key, the same way
    // the institution, device and SMTP screens do.
    canPerform: (operation) => permissionsStore.canPerform(HOST_MODULE.host, operation),
  };
};

export const institutionEmailTemplateScope = (): EmailTemplateScope => {
  const api = inject(InstitutionEmailTemplateApi);
  const featurePageStore = inject(FeaturePageStore);
  const moduleCode = 'INSTITUTION_EMAIL_TEMPLATE';

  return {
    api,
    sync: () => api.syncEmailTemplates(),
    listRoute: '/app/institution-email-templates',
    moduleCode,
    pageDescription: 'Manage the wording your organization sends for each event',
    // Off `my-menu` rather than `CurrentUserPermissionsStore`, as `institution-email-config` does: the
    // institution catalog is not known to name this module, and `canPerform` denies an unknown name.
    canPerform: (operation) => featurePageStore.canPerformOrUnknown(moduleCode, operation),
  };
};

/** Defaults to the Host catalog; the institution route provides {@link institutionEmailTemplateScope}. */
export const EMAIL_TEMPLATE_SCOPE = new InjectionToken<EmailTemplateScope>('EMAIL_TEMPLATE_SCOPE', {
  factory: hostEmailTemplateScope,
});
