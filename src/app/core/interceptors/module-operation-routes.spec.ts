import { describe, expect, it } from 'vitest';

import { asCandidateList } from '@core/feature-page-identifiers';
import { environment } from '@env/environment';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import {
  MODULE_OPERATION_ROUTES,
  moduleFromTabInfoType,
  resolveModuleOperationRoute,
} from './module-operation-routes';

/**
 * The StaffMember-family slice of a live `GET /Navigation/my-menu`, read on 2026-09-02, plus the one
 * host page the table names a row for.
 *
 * The table's whole job is to name pages and operations this payload publishes, so the fixture is
 * the only thing that can catch a row naming an id space that does not exist. Refresh it from the
 * live endpoint when the backend publishes new pages.
 */
const LIVE_PAGES: Readonly<Record<string, readonly string[]>> = {
  STAFF_DIRECTORY: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Import',
    'Export',
    'Assign',
    'Remove',
    'Resend Credentials',
    // Read live 2026-09-25: moved here from `EMP_PASSWORD_MANAGEMENT`, operation id 21.
    'Reset Password',
  ],
  STAFF_OVERVIEW: ['View', 'Update', 'Verify', 'Allow Editing'],
  STAFF_BANK_DETAILS: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_CONTACT_DETAILS: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_EXPERIENCE: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_INSURANCE: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_IDENTITY: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_QUALIFICATIONS: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_DEPENDANTS: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_DOCUMENTS: [
    'View',
    'Upload',
    'Download',
    'Delete',
    'Verify',
    'Allow Editing',
  ],
  STAFF_CAMPUS_ASSIGNMENTS: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Allow Editing',
  ],
  STAFF_DEVICE_ENROLMENTS: ['View', 'Assign', 'Remove'],
  STAFF_WORK_ARRANGEMENTS: ['View', 'Add', 'Update', 'Delete', 'Allow Editing'],
  STAFF_WORK_PATTERNS: ['View', 'Add', 'Update', 'Delete', 'Allow Editing'],
  STAFF_WORK_MODE_OVERRIDES: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Approve',
    'Reject',
  ],
  EMP_PASSWORD_MANAGEMENT: ['Reset Password'],
  // Host permission catalog, verified 2026-09-29 after the canonical mapping correction.
  HOST_INSTITUTION_LIST: [
    'Active',
    'Delete',
    'Inactive',
    'Restore',
    'Update',
    'View',
  ],
  // Host menu, read live 2026-09-06: module id 34, operation Add 1. The host create is its own
  // page, which is why the create row does not take the controller fallback's module.
  HOST_INSTITUTION_CREATE: ['Add'],
  // Host menu, read live: module id 45, operations View 4, Add 1, Update 2, Delete 3.
  HOST_DEFAULT_EMAIL_CONFIG: ['View', 'Add', 'Update', 'Delete'],
  // Host menu, read live 2026-09-06: module id 47, operations Add 1, Delete 3, Update 2, View 4.
  HOST_EMAIL_TEMPLATE: ['View', 'Add', 'Update', 'Delete'],
  // Institution menu, read live 2026-09-25: module id 119, a child of `INSTITUTION_EMAIL_CONFIG` (46).
  // Operations Add 1, Delete 3, Update 2, View 4.
  INSTITUTION_EMAIL_TEMPLATE: ['View', 'Add', 'Update', 'Delete'],
  // Host menu, read live 2026-09-06: module id 54, operations Add 1, Delete 3, Update 2, View 4.
  // The device catalog screen — `HOST_DEVICE_INVENTORY` (37) is the separate, unbuilt page.
  // `Import` added 2026-09-19: the all-targets live smoke run resolved it from `my-menu` for
  // this code and imported through `/DeviceMaster/import/*` with it.
  HOST_DEVICE_SETUP: ['View', 'Add', 'Update', 'Delete', 'Import'],
  // Host menu, read live 2026-09-06: module id 35, operations Active 8, Assign 11, Inactive 9,
  // Remove 12, Update 2, View 4.
  INSTITUTION_DEVICES: [
    'Active',
    'Assign',
    'Inactive',
    'Remove',
    'Update',
    'View',
  ],
  // Host menu, read live 2026-09-06: module id 36, operations Add 1, Update 2, View 4.
  INSTITUTION_DEVICE_CONFIG: ['Add', 'Update', 'View'],
  // Module id 27, operations Add 1 and View 4, as used by the recorded Role bulk-import runs in
  // `docs/specs/bulk-upload/results/live-summary.json`. Only the two that run evidences are listed.
  INSTITUTION_ACCESS: ['Add', 'View'],
  // Module id 25, operations Add 1 and View 4, as used by the recorded Department bulk-import runs
  // in `docs/specs/bulk-upload/README.md`. Only the two that run evidences are listed.
  INSTITUTION_DEPARTMENTS: ['Add', 'View'],
  // Module id 26, operations Add 1 and View 4, as recorded for the Designation bulk-import runs in
  // `docs/specs/bulk-upload/results/live-summary.json`. Only the two that run evidences are listed.
  INSTITUTION_STAFF_DESIGNATIONS: ['Add', 'View'],
  // Institution menu, module id 67: Add 1, Create 22, Delete 3, Update 2, View 4.
  INSTITUTION_ATTENDANCE_POLICIES: [
    'Add',
    'Create',
    'Delete',
    'Update',
    'View',
  ],
  // Institution menu, module id 79: Add 1, Delete 3, Import 13, Update 2, View 4.
  STAFF_EMPLOYMENT_TYPES: ['Add', 'Delete', 'Import', 'Update', 'View'],
  // Host menu, read live 2026-09-16 via `/Module/import/preview`: module id 72. `Add` is granted
  // but the endpoint 403'd on it; `Import` cleared the 403 (then hit an unrelated backend 500).
  // Only the one operation actually exercised is listed.
  HOST_MODULES: ['Import'],
  // Host menu, resolved from `my-menu` and exercised end to end by the all-targets live smoke
  // run on 2026-09-19 (`docs/testing/bulk/all-live-smoke/2026-09-19.md`). That run asked each
  // code for `Import` alone and used it for the reads as well, so `Import` is the only
  // operation with evidence behind it - the same discipline `HOST_MODULES` above is listed
  // under.
  HOST_INSTITUTION_RFID_MANAGEMENT: ['Import'],
  HOST_SUBMODULES: ['Import'],
  HOST_OPERATIONS: ['Import'],
  HOST_MODULE_OPERATIONS: ['Import'],
  // Read live 2026-09-23 (renamed from `INSTITUTION_POLICY_HOLIDAY_CALENDAR`): module id 118,
  // operations Add 1, Delete 3, Export 23, Import 13, Update 2, View 4.
  INSTITUTION_POLICY_HOLIDAY: [
    'View',
    'Add',
    'Update',
    'Delete',
    'Import',
    'Export',
  ],
  // Host billing leaves, children of `HOST_SUBSCRIPTIONS`. Taken from the backend seed
  // `database-scripts/SeedHostBillingConfigurationModule.sql` (main_branch, 2026-10-04), not yet
  // read live — refresh from `my-menu` once a Host session is captured.
  HOST_BILLING_CONFIGURATION: ['View', 'Update'],
  HOST_BILLING_PLAN_PRICES: ['View', 'Add', 'Update', 'Delete'],
  HOST_BILLING_TAX_RULES: ['View', 'Add', 'Update', 'Delete'],
  HOST_BILLING_TRANSACTIONS: ['View'],
  HOST_BILLING_REFUNDS: ['View', 'Add'],
  HOST_BILLING_RECONCILIATION: ['View', 'Update'],
  HOST_BILLING_AUDIT: ['View'],
};

/**
 * Codes a row may name that `LIVE_PAGES` above cannot cover, because that capture is a host
 * session's menu and these are the institution-scope twins — or, for `HOST_MODULES`, because it has not
 * been read live at all yet. Listed rather than skipped so a typo in the second half of a pair
 * still fails: the fixture has to be told about a code before it passes.
 */
const UNCAPTURED_PAGES: ReadonlySet<string> = new Set([
  'INSTITUTION_DEVICE_SETUP',
]);

describe('resolveModuleOperationRoute', () => {
  it('matches a literal path', () => {
    const route = resolveModuleOperationRoute(
      'GET',
      `${environment.apiUrl}/Staff/get-all`,
    );

    expect(route).toMatchObject({
      module: 'STAFF_DIRECTORY',
      operation: 'View',
      carrier: 'query',
    });
  });

  it('is case-insensitive on the path, as ASP.NET routing is', () => {
    const route = resolveModuleOperationRoute(
      'POST',
      `${environment.apiUrl}/Staff/Sensitive/create`,
    );

    expect(route?.operation).toBe('Add');
  });

  it('maps sensitive updates to the Identity module update permission', () => {
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Staff/Sensitive/update`,
      ),
    ).toMatchObject({
      module: 'STAFF_IDENTITY',
      operation: 'Update',
      carrier: 'body',
    });
  });

  it('maps the identity delete to the Identity module delete permission, ids in the body', () => {
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/Staff/Sensitive/delete`,
      ),
    ).toMatchObject({
      module: 'STAFF_IDENTITY',
      operation: 'Delete',
      carrier: 'body',
    });
  });

  it('routes the staffMember password reset to the page that publishes it', () => {
    const route = resolveModuleOperationRoute(
      'POST',
      `${environment.apiUrl}/Staff/reset-password`,
    );

    expect(route).toMatchObject({
      module: ['STAFF_DIRECTORY', 'EMP_PASSWORD_MANAGEMENT'],
      operation: 'Reset Password',
      carrier: 'body',
    });
  });

  it('distinguishes methods on the same path', () => {
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Staff/get-all`,
      ),
    ).toBe(undefined);
  });

  it('matches `{id}` against exactly one segment', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/StaffWorkPattern/get-by-id/42`,
      ),
    ).toBeDefined();
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/StaffWorkPattern/get-by-id/`,
      ),
    ).toBe(undefined);
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/StaffWorkPattern/get-by-id/42/extra`,
      ),
    ).toBe(undefined);
  });

  it('keeps the institution resend off the POST fallback, which would carry the ids in the body', () => {
    const route = resolveModuleOperationRoute(
      'POST',
      `${environment.apiUrl}/Institution/2ON458Q1/resend-verification-by-host`,
    );

    // Swagger declares ModuleId / OperationId as query params and no request body at all.
    expect(route).toMatchObject({
      module: 'HOST_INSTITUTION_LIST',
      operation: 'Update',
      carrier: 'query',
    });
  });

  it('routes the card bind to the device page, not the two-segment fallback', () => {
    const route = resolveModuleOperationRoute(
      'POST',
      `${environment.apiUrl}/StaffDeviceEnrollment/card/bind`,
    );

    expect(route).toMatchObject({
      module: 'STAFF_DEVICE_ENROLMENTS',
      operation: 'Assign',
      carrier: 'body',
    });
  });

  it('routes the credential removal to Remove, not the Assign the other writes take', () => {
    const route = resolveModuleOperationRoute(
      'POST',
      `${environment.apiUrl}/StaffDeviceEnrollment/credential/remove`,
    );

    expect(route).toMatchObject({
      module: 'STAFF_DEVICE_ENROLMENTS',
      operation: 'Remove',
      carrier: 'body',
    });
  });

  it.each([
    ['POST', '/Staff/Monitoring/policy', 'Assign', 'body'],
    ['POST', '/Staff/Monitoring/agent/register', 'Assign', 'body'],
    ['GET', '/Staff/Monitoring/agent/status', 'View', 'query'],
  ])(
    'routes %s %s to STAFF_DEVICE_ENROLMENTS %s',
    (method, path, operation, carrier) => {
      expect(
        resolveModuleOperationRoute(method, `${environment.apiUrl}${path}`),
      ).toMatchObject({
        module: 'STAFF_DEVICE_ENROLMENTS',
        operation,
        carrier,
      });
    },
  );

  it('leaves the agent runtime routes alone', () => {
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Staff/Monitoring/runtime/heartbeat`,
      ),
    ).toBeUndefined();
  });

  it('ignores a query string embedded in the URL', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Staff/get-all?PageNumber=2`,
      ),
    ).toBeDefined();
  });

  it('authorises the role bulk writes against Add, not the inferred Update', () => {
    for (const path of ['/Role/bulk/preview', '/Role/bulk/confirm']) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'INSTITUTION_ACCESS',
        operation: 'Add',
        carrier: 'body',
      });
    }
  });

  it('leaves the role bulk reads on the fallback, which already resolves View on the query', () => {
    const paths = [
      '/Role/bulk/template',
      '/Role/bulk/jobs/job-1',
      '/Role/bulk/jobs/job-1/report',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'INSTITUTION_ACCESS',
        operation: 'View',
        carrier: 'query',
      });
    }
  });

  it('does not attach module permission identifiers to the role type constants lookup', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Role/type-options`,
      ),
    ).toBeUndefined();
  });

  it('authorises the department bulk writes against Add, not the inferred Update', () => {
    for (const path of [
      '/Department/bulk/preview',
      '/Department/bulk/confirm',
    ]) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'INSTITUTION_DEPARTMENTS',
        operation: 'Add',
        carrier: 'body',
      });
    }
  });

  it('authorises the designation bulk writes against Add, not the inferred Update', () => {
    for (const path of [
      '/Designation/bulk/preview',
      '/Designation/bulk/confirm',
    ]) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'INSTITUTION_STAFF_DESIGNATIONS',
        operation: 'Add',
        carrier: 'body',
      });
    }
  });

  it('leaves the designation bulk reads on the fallback, which already resolves View on the query', () => {
    const paths = [
      '/Designation/bulk/template',
      '/Designation/bulk/jobs/job-1',
      '/Designation/bulk/jobs/job-1/report',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'INSTITUTION_STAFF_DESIGNATIONS',
        operation: 'View',
        carrier: 'query',
      });
    }
  });

  it('authorises the staff-employment-type bulk writes against Add, not the inferred Update', () => {
    for (const path of [
      '/StaffEmploymentType/bulk/preview',
      '/StaffEmploymentType/bulk/confirm',
    ]) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'STAFF_EMPLOYMENT_TYPES',
        operation: 'Add',
        carrier: 'body',
      });
    }
  });

  it('authorises the staffMember bulk writes against STAFF_DIRECTORY and Add', () => {
    const paths = [
      '/Staff/bulk/preview',
      '/Staff/bulk/confirm',
      '/Staff/bulk/send-invitations',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'STAFF_DIRECTORY',
        operation: 'Add',
        carrier: 'body',
      });
    }
  });

  /** `StaffMember` has no controller fallback, so these would resolve nothing without their own rows. */
  it('resolves the staffMember bulk reads, which no fallback would synthesise', () => {
    const paths = [
      '/Staff/bulk/template',
      '/Staff/bulk/jobs/job-1',
      '/Staff/bulk/jobs/job-1/report',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'STAFF_DIRECTORY',
        operation: 'View',
        carrier: 'query',
      });
    }
  });

  it('leaves the staff-employment-type bulk reads on the fallback, which already resolves View on the query', () => {
    const paths = [
      '/StaffEmploymentType/bulk/template',
      '/StaffEmploymentType/bulk/jobs/job-1',
      '/StaffEmploymentType/bulk/jobs/job-1/report',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'STAFF_EMPLOYMENT_TYPES',
        operation: 'View',
        carrier: 'query',
      });
    }
  });

  it('authorises the module catalogue bulk writes against Import, not the inferred Update', () => {
    for (const path of ['/Module/import/preview', '/Module/import/confirm']) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'HOST_MODULES',
        operation: 'Import',
        carrier: 'body',
      });
    }
  });

  it('leaves the module catalogue bulk reads on the fallback, which already resolves View on the query', () => {
    const paths = [
      '/Module/import/job',
      '/Module/import/jobs',
      '/Module/import/template',
      '/Module/import/report',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'HOST_MODULES',
        operation: 'View',
        carrier: 'query',
      });
    }
  });

  it('leaves the module catalogue bulk retry/cancel on the fallback, same as every other master', () => {
    for (const path of ['/Module/import/retry', '/Module/import/cancel']) {
      const route = resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'HOST_MODULES',
        operation: 'Update',
        carrier: 'body',
      });
    }
  });

  it('stamps Import on the four Host catalogues the fallback cannot serve', () => {
    // `SubModule`, `Operation` and `ModuleOperation` are denied the fallback outright, and
    // `InstitutionCardMaster`'s fallback names the wrong leaf, so every one of their eight routes needs
    // a row. Reads included: the live run authorised those with `Import` too.
    const families: [string, string][] = [
      ['/InstitutionCardMaster', 'HOST_INSTITUTION_RFID_MANAGEMENT'],
      ['/ChildModule', 'HOST_SUBMODULES'],
      ['/Operation', 'HOST_OPERATIONS'],
      ['/ModuleOperation', 'HOST_MODULE_OPERATIONS'],
    ];

    for (const [controller, module] of families) {
      for (const leaf of ['preview', 'confirm', 'retry', 'cancel']) {
        expect(
          resolveModuleOperationRoute(
            'POST',
            `${environment.apiUrl}${controller}/import/${leaf}`,
          ),
        ).toMatchObject({ module, operation: 'Import', carrier: 'body' });
      }
      for (const leaf of ['job', 'jobs', 'template', 'report']) {
        expect(
          resolveModuleOperationRoute(
            'GET',
            `${environment.apiUrl}${controller}/import/${leaf}`,
          ),
        ).toMatchObject({ module, operation: 'Import', carrier: 'query' });
      }
    }
  });

  it('corrects every device catalogue write, leaving its reads on the fallback', () => {
    // retry/cancel included: the shared Host adapter exposes them for this target too.
    for (const leaf of ['preview', 'confirm', 'retry', 'cancel']) {
      expect(
        resolveModuleOperationRoute(
          'POST',
          `${environment.apiUrl}/DeviceMaster/import/${leaf}`,
        ),
      ).toMatchObject({
        module: 'HOST_DEVICE_SETUP',
        operation: 'Import',
        carrier: 'body',
      });
    }

    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/DeviceMaster/import/template`,
      ),
    ).toMatchObject({
      module: 'HOST_DEVICE_SETUP',
      operation: 'View',
      carrier: 'query',
    });
  });

  it('routes every host billing endpoint to its own leaf and carrier', () => {
    const cases: [string, string, string, string, string][] = [
      [
        'GET',
        '/host/billing/configuration',
        'HOST_BILLING_CONFIGURATION',
        'View',
        'query',
      ],
      [
        'PUT',
        '/host/billing/configuration',
        'HOST_BILLING_CONFIGURATION',
        'Update',
        'permissionRequest',
      ],
      [
        'GET',
        '/host/billing/plan-prices',
        'HOST_BILLING_PLAN_PRICES',
        'View',
        'query',
      ],
      [
        'POST',
        '/host/billing/plan-prices',
        'HOST_BILLING_PLAN_PRICES',
        'Add',
        'permissionRequest',
      ],
      [
        'PUT',
        '/host/billing/plan-prices/7',
        'HOST_BILLING_PLAN_PRICES',
        'Update',
        'permissionRequest',
      ],
      [
        'DELETE',
        '/host/billing/plan-prices/7',
        'HOST_BILLING_PLAN_PRICES',
        'Delete',
        'query',
      ],
      [
        'GET',
        '/host/billing/tax-rules',
        'HOST_BILLING_TAX_RULES',
        'View',
        'query',
      ],
      [
        'POST',
        '/host/billing/tax-rules',
        'HOST_BILLING_TAX_RULES',
        'Add',
        'permissionRequest',
      ],
      [
        'PUT',
        '/host/billing/tax-rules/7',
        'HOST_BILLING_TAX_RULES',
        'Update',
        'permissionRequest',
      ],
      [
        'DELETE',
        '/host/billing/tax-rules/7',
        'HOST_BILLING_TAX_RULES',
        'Delete',
        'query',
      ],
      [
        'GET',
        '/host/billing/transactions',
        'HOST_BILLING_TRANSACTIONS',
        'View',
        'query',
      ],
      ['GET', '/host/billing/refunds', 'HOST_BILLING_REFUNDS', 'View', 'query'],
      [
        'POST',
        '/host/billing/refunds',
        'HOST_BILLING_REFUNDS',
        'Add',
        'permissionRequest',
      ],
      [
        'GET',
        '/host/billing/reconciliation',
        'HOST_BILLING_RECONCILIATION',
        'View',
        'query',
      ],
      [
        'POST',
        '/host/billing/webhooks/42/retry',
        'HOST_BILLING_RECONCILIATION',
        'Update',
        'body',
      ],
      ['GET', '/host/billing/audit', 'HOST_BILLING_AUDIT', 'View', 'query'],
    ];

    for (const [method, path, module, operation, carrier] of cases) {
      expect(
        resolveModuleOperationRoute(method, `${environment.apiUrl}${path}`),
      ).toMatchObject({
        module,
        operation,
        carrier,
      });
    }
  });

  it('authorises attendance-policy creation against Create, not the generic Add', () => {
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/AttendancePolicy/create`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_ATTENDANCE_POLICIES',
      operation: 'Create',
      carrier: 'body',
    });
  });

  it('authorises the holiday-calendar create and import against Add and Import, not the inferred Update', () => {
    expect(
      resolveModuleOperationRoute('POST', `${environment.apiUrl}/Holiday`),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'Add',
      carrier: 'body',
    });

    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Holiday/import`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'Import',
      carrier: 'body',
    });
  });

  it('authorises the holiday-calendar export against Export, not the inferred View', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Holiday/export`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'Export',
      carrier: 'query',
    });
  });

  it('leaves the holiday-calendar list, single-row read, update and delete on the fallback', () => {
    expect(
      resolveModuleOperationRoute('GET', `${environment.apiUrl}/Holiday/get`),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'View',
      carrier: 'query',
    });

    expect(
      resolveModuleOperationRoute('GET', `${environment.apiUrl}/Holiday/42`),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'View',
      carrier: 'query',
    });

    expect(
      resolveModuleOperationRoute('PUT', `${environment.apiUrl}/Holiday/42`),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'Update',
      carrier: 'body',
    });

    expect(
      resolveModuleOperationRoute('DELETE', `${environment.apiUrl}/Holiday/42`),
    ).toMatchObject({
      module: 'INSTITUTION_POLICY_HOLIDAY',
      operation: 'Delete',
      carrier: 'query',
    });
  });

  it('leaves the department bulk reads on the fallback, which already resolves View on the query', () => {
    const paths = [
      '/Department/bulk/template',
      '/Department/bulk/jobs/job-1',
      '/Department/bulk/jobs/job-1/report',
    ];

    for (const path of paths) {
      const route = resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}${path}`,
      );
      expect(route).toMatchObject({
        module: 'INSTITUTION_DEPARTMENTS',
        operation: 'View',
        carrier: 'query',
      });
    }
  });

  it('ignores URLs outside the API host', () => {
    expect(
      resolveModuleOperationRoute('GET', './data/leaves/my-leaves.json'),
    ).toBe(undefined);
  });

  it('does not cover the source it reads from, which it would deadlock', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Navigation/my-menu`,
      ),
    ).toBe(undefined);
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Institution/get-all-institution-operations`,
      ),
    ).toBe(undefined);
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Auth/refresh-token`,
      ),
    ).toBe(undefined);
  });
});

describe('MODULE_OPERATION_ROUTES', () => {
  it('has one row per method and path', () => {
    const keys = MODULE_OPERATION_ROUTES.map(
      (r) => `${r.method} ${r.path.toLowerCase()}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('states every field in the shape the matcher assumes', () => {
    for (const route of MODULE_OPERATION_ROUTES) {
      expect(route.path.startsWith('/')).toBe(true);
      expect(route.method).toBe(route.method.toUpperCase());
      expect(['query', 'body', 'permissionRequest']).toContain(route.carrier);
      expect(route.operation).toBe(route.operation.trim());
      expect(route.operation.length).toBeGreaterThan(0);

      if (typeof route.module === 'string') {
        expect(route.module).toBe(route.module.toUpperCase());
      } else if (Array.isArray(route.module)) {
        expect(route.module.length).toBeGreaterThan(0);
        for (const code of route.module) expect(code).toBe(code.toUpperCase());
      } else {
        expect(typeof route.module).toBe('function');
      }
    }
  });

  it('names only pages the feature-page catalog publishes', () => {
    for (const route of MODULE_OPERATION_ROUTES) {
      if (typeof route.module === 'function') continue;
      // Every candidate has to be accounted for, or a typo in the second code of a pair would be
      // checked against nothing — `UNCAPTURED_PAGES` is the explicit list of the ones this host
      // fixture cannot cover, so adding a code is a deliberate act rather than a silent pass.
      for (const code of asCandidateList(route.module)) {
        expect(code in LIVE_PAGES || UNCAPTURED_PAGES.has(code)).toBe(true);
      }
      // A row must still name at least one page the fixture knows, or it asserts nothing at all.
      expect(
        asCandidateList(route.module).some((code) => code in LIVE_PAGES),
      ).toBe(true);
    }
  });

  it('names only operations the row page publishes', () => {
    for (const route of MODULE_OPERATION_ROUTES) {
      if (typeof route.module === 'function') continue;
      const publishedCandidates = asCandidateList(route.module).filter(
        (code) => code in LIVE_PAGES,
      );

      // Candidate resolution is operation-aware: at least one published candidate must own the
      // operation. Compatibility candidates may intentionally omit it in the current catalog.
      expect(
        publishedCandidates.some((code) =>
          LIVE_PAGES[code].includes(route.operation),
        ),
      ).toBe(true);
    }
  });

  it('pins the device page to the operations it actually has', () => {
    // The CRUD verbs are deliberately absent, which is why the device rows say Assign / Remove.
    expect(LIVE_PAGES['STAFF_DEVICE_ENROLMENTS']).not.toContain('Update');
    expect(LIVE_PAGES['STAFF_DEVICE_ENROLMENTS']).not.toContain('Add');
  });
});

describe('moduleFromTabInfoType', () => {
  it('maps every profile tab to a page that publishes Verify and Allow Editing', () => {
    for (const tab of Object.values(PROFILE_TABS)) {
      const code = moduleFromTabInfoType({ tabInfoType: tab });

      expect(code).toBeDefined();
      expect(LIVE_PAGES[code as string]).toContain('Verify');
      expect(LIVE_PAGES[code as string]).toContain('Allow Editing');
    }
  });

  it('maps the basic-info tab to the profile overview, not the staffMember list', () => {
    expect(
      moduleFromTabInfoType({ tabInfoType: PROFILE_TABS.StaffMember }),
    ).toBe('STAFF_OVERVIEW');
    expect(moduleFromTabInfoType({ tabInfoType: PROFILE_TABS.Bank })).toBe(
      'STAFF_BANK_DETAILS',
    );
  });

  it('resolves nothing when the body does not name a tab', () => {
    expect(moduleFromTabInfoType(null)).toBe(undefined);
    expect(moduleFromTabInfoType(undefined)).toBe(undefined);
    expect(moduleFromTabInfoType({})).toBe(undefined);
    expect(moduleFromTabInfoType({ tabInfoType: '2' })).toBe(undefined);
    expect(moduleFromTabInfoType({ tabInfoType: 99 })).toBe(undefined);
    expect(moduleFromTabInfoType(new FormData())).toBe(undefined);
  });
});

describe('the controller fallback', () => {
  it('resolves a controller with no explicit row', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Department/get-all`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_DEPARTMENTS',
      operation: 'View',
      carrier: 'query',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Department/add`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_DEPARTMENTS',
      operation: 'Add',
      carrier: 'body',
    });
  });

  it('authorises the super-admin dashboard widgets against the institution dashboard page', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Dashboard/SuperAdmin/Summary`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_DASHBOARD_OVERVIEW',
      operation: 'View',
      carrier: 'query',
    });
  });

  it('authorises attendance-policy reads against its institution menu page', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/AttendancePolicy/get-all`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_ATTENDANCE_POLICIES',
      operation: 'View',
      carrier: 'query',
    });
  });

  it('authorises staff-employment-type options against its institution menu page', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/StaffEmploymentType/option`,
      ),
    ).toMatchObject({
      module: 'STAFF_EMPLOYMENT_TYPES',
      operation: 'View',
      carrier: 'query',
    });
  });

  it('authorises the staff professional structure through STAFF_DIRECTORY', () => {
    const cases: [string, string, string, string][] = [
      [
        'GET',
        '/Staff/professional-structure/masters/job-family',
        'View',
        'query',
      ],
      [
        'POST',
        '/Staff/professional-structure/masters/capability',
        'Add',
        'body',
      ],
      ['PUT', '/Staff/professional-structure/masters/duty/7', 'Update', 'body'],
      [
        'DELETE',
        '/Staff/professional-structure/masters/job-family/7',
        'Delete',
        'query',
      ],
      ['GET', '/Staff/professional-structure/positions', 'View', 'query'],
      ['POST', '/Staff/professional-structure/positions', 'Add', 'body'],
      ['PUT', '/Staff/professional-structure/positions/7', 'Update', 'body'],
      [
        'DELETE',
        '/Staff/professional-structure/positions/7',
        'Delete',
        'query',
      ],
      ['GET', '/Staff/professional-structure/staff/AIA-0001', 'View', 'query'],
      [
        'PUT',
        '/Staff/professional-structure/capability-verification/9',
        'Update',
        'body',
      ],
    ];

    for (const [method, path, operation, carrier] of cases) {
      expect(
        resolveModuleOperationRoute(method, `${environment.apiUrl}${path}`),
      ).toMatchObject({
        module: 'STAFF_DIRECTORY',
        operation,
        carrier,
      });
    }
  });

  it('infers the operation from the method and the last segment', () => {
    const cases: [string, string, string][] = [
      ['GET', '/InstitutionDevice/get-by-id/7', 'View'],
      ['DELETE', '/InstitutionDevice/delete/7', 'Remove'],
      ['POST', '/InstitutionDevice/create', 'Assign'],
      ['POST', '/Designation/add', 'Add'],
      ['POST', '/InstitutionDevice/update-status', 'Update'],
      ['PUT', '/Role/update', 'Update'],
    ];

    for (const [method, path, operation] of cases) {
      expect(
        resolveModuleOperationRoute(method, `${environment.apiUrl}${path}`)
          ?.operation,
      ).toBe(operation);
    }
  });

  it('overrides Institution Device CRUD verb inference with its published workflow operations', () => {
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/InstitutionDevice/create`,
      ),
    ).toMatchObject({ operation: 'Assign', carrier: 'body' });
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/InstitutionDevice/delete/7`,
      ),
    ).toMatchObject({ operation: 'Remove', carrier: 'query' });
  });

  it('carries reads and deletes on the query string and writes in the body', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/Institution/get-all-institutions`,
      )?.carrier,
    ).toBe('query');
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/Designation/delete`,
      )?.carrier,
    ).toBe('query');
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Institution/update-institution`,
      )?.carrier,
    ).toBe('body');
  });

  it('carries the institution email config on the fallback, flat rather than nested', () => {
    // The host twin needs explicit rows because its write DTOs nest the pair; this controller
    // takes it at the body root, so the fallback's own carriers are already right.
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/InstitutionEmailConfig/get-all`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_CONFIG',
      operation: 'View',
      carrier: 'query',
    });
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/InstitutionEmailConfig/delete/7`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_CONFIG',
      operation: 'Delete',
      carrier: 'query',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/InstitutionEmailConfig/create`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_CONFIG',
      operation: 'Add',
      carrier: 'body',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/InstitutionEmailConfig/update`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_CONFIG',
      operation: 'Update',
      carrier: 'body',
    });
  });

  it('carries the email template writes nested and its reads on the query string', () => {
    // The three writes need explicit rows because their DTOs nest the pair inside
    // `PermissionRequestDTO`; the reads and the delete ride the fallback's own carriers.
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/EmailTemplate/create`,
      ),
    ).toMatchObject({
      module: 'HOST_EMAIL_TEMPLATE',
      operation: 'Add',
      carrier: 'permissionRequest',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/EmailTemplate/update-status`,
      ),
    ).toMatchObject({
      module: 'HOST_EMAIL_TEMPLATE',
      operation: 'Update',
      carrier: 'permissionRequest',
    });
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/EmailTemplate/get-all`,
      ),
    ).toMatchObject({
      module: 'HOST_EMAIL_TEMPLATE',
      operation: 'View',
      carrier: 'query',
    });
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/EmailTemplate/delete/7`,
      ),
    ).toMatchObject({
      module: 'HOST_EMAIL_TEMPLATE',
      operation: 'Delete',
      carrier: 'query',
    });
  });

  it('carries the institution email template writes nested, with sync authorised as Add', () => {
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/InstitutionEmailTemplate/update`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_TEMPLATE',
      operation: 'Update',
      carrier: 'permissionRequest',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/InstitutionEmailTemplate/sync`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_TEMPLATE',
      operation: 'Add',
      carrier: 'permissionRequest',
    });
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/InstitutionEmailTemplate/get-by-id/7`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_TEMPLATE',
      operation: 'View',
      carrier: 'query',
    });
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/InstitutionEmailTemplate/delete/7`,
      ),
    ).toMatchObject({
      module: 'INSTITUTION_EMAIL_TEMPLATE',
      operation: 'Delete',
      carrier: 'query',
    });
  });

  it('does not shadow an explicit row', () => {
    // `/Staff` is absent from the fallback precisely because one URL serves two modules.
    expect(
      resolveModuleOperationRoute('POST', `${environment.apiUrl}/Staff/update`),
    ).toMatchObject({ module: 'STAFF_OVERVIEW', operation: 'Update' });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/Staff/whatever`,
      ),
    ).toBe(undefined);
  });

  it('keeps the longer device controller apart from the shorter one', () => {
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/InstitutionDeviceConfiguration/get-all`,
      )?.module,
    ).toEqual([
      'INSTITUTION_DEVICE_CONFIG',
      'INSTITUTION_DEVICE_CONFIGURATION',
    ]);
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/InstitutionDevice/get-all`,
      )?.module,
    ).toEqual(['INSTITUTION_DEVICES', 'INSTITUTION_DEVICE_SETUP']);
  });

  it('names both codes a screen is published under, host and institution', () => {
    // `my-menu` is permission-filtered, so one of each pair reaches a given session. Naming both
    // is what lets the session's own tree supply the id instead of a constant in this file.
    expect(
      resolveModuleOperationRoute('GET', `${environment.apiUrl}/Campus/get-all`)
        ?.module,
    ).toEqual(['INSTITUTION_CAMPUSES', 'HOST_CAMPUS_LIST']);
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/InstitutionDevice/create`,
      )?.module,
    ).toEqual(['INSTITUTION_DEVICES', 'INSTITUTION_DEVICE_SETUP']);
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/InstitutionDevice/delete/7`,
      )?.module,
    ).toEqual(['INSTITUTION_DEVICES', 'INSTITUTION_DEVICE_SETUP']);
  });

  it('sends the device catalog to the page that publishes it', () => {
    // `HOST_DEVICE_SETUP` is the leaf `my-menu` publishes at `/app/device-masters`. Its sibling
    // `HOST_DEVICE_INVENTORY` is the unbuilt `/host/devices` page and owns no request here, so a
    // revert to that code would send every DeviceMaster write the wrong `ModuleId`.
    expect(
      resolveModuleOperationRoute(
        'GET',
        `${environment.apiUrl}/DeviceMaster/get-all`,
      ),
    ).toMatchObject({
      module: 'HOST_DEVICE_SETUP',
      operation: 'View',
      carrier: 'query',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/DeviceMaster/create`,
      ),
    ).toMatchObject({
      module: 'HOST_DEVICE_SETUP',
      operation: 'Add',
      carrier: 'body',
    });
    expect(
      resolveModuleOperationRoute(
        'POST',
        `${environment.apiUrl}/DeviceMaster/update`,
      ),
    ).toMatchObject({
      module: 'HOST_DEVICE_SETUP',
      operation: 'Update',
      carrier: 'body',
    });
    expect(
      resolveModuleOperationRoute(
        'DELETE',
        `${environment.apiUrl}/DeviceMaster/delete/9`,
      ),
    ).toMatchObject({
      module: 'HOST_DEVICE_SETUP',
      operation: 'Delete',
      carrier: 'query',
    });
  });

  it('leaves the denied controllers alone', () => {
    const denied: [string, string][] = [
      // Deadlock: the tree this resolver's ids come from, and the refresh that retries a parked
      // request.
      ['GET', '/Navigation/my-menu'],
      ['POST', '/Auth/refresh-token'],
      ['GET', '/Institution/get-all-institution-operations'],
      // Bodies whose `moduleId` / `operationId` mean the mapping's target, not the caller.
      ['POST', '/ModuleOperation/create'],
      ['POST', '/PlanModuleMapping/create'],
      ['GET', '/OperationsMaster/get-operation/3'],
      ['POST', '/ParentModule/create'],
      ['POST', '/ChildModule/create'],
      // Lookups. `/Option` is the pointed one — its `OperationId` filters the result set.
      ['GET', '/Option/has-access'],
      ['GET', '/Enum/get-all'],
      ['GET', '/CommonMenu/get-all'],
      ['GET', '/Staff/Contact/relation-options'],
      ['GET', '/Staff/Category/options'],
    ];

    for (const [method, path] of denied) {
      expect(
        resolveModuleOperationRoute(method, `${environment.apiUrl}${path}`),
      ).toBe(undefined);
    }
  });

  it('resolves nothing for a controller with no module code', () => {
    // Asset, Leave and the rest have no page in `my-menu` yet, so there is nothing to name.
    expect(
      resolveModuleOperationRoute('POST', `${environment.apiUrl}/Asset/add`),
    ).toBe(undefined);
    expect(
      resolveModuleOperationRoute('GET', `${environment.apiUrl}/Leave/get-all`),
    ).toBe(undefined);
  });
});
