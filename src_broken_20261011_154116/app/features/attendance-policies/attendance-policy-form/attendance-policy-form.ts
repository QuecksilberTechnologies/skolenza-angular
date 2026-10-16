import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, Observable, of } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import { AttendancePolicyApi, Common, PolicyTypeApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  AttendanceConfigMutationRes,
  AttendanceLocationScope,
  AttendancePolicyRow,
  CreateAttendancePolicyReq,
  PolicyTypesName,
} from '@shared/interfaces';
import { ATTENDANCE_LOCATION_SCOPES } from '@shared/utilities/common-data';
import { showFieldError } from '@shared/utilities/field-error';

import { AttendancePolicyFormModel, attendancePolicySchema } from './attendance-policy-form.schema';

const emptyModel: AttendancePolicyFormModel = {
  policyTypeId: null,
  policyName: '',
  description: '',
  remark: '',

  attendanceLocationScope: null,
  requireGeoFenceForOffice: false,
  requireGpsForRemote: false,
  allowOutsideLocationWithApproval: false,

  allowBiometric: true,
  allowMobile: false,
  allowWeb: false,
  allowManualAttendance: false,
  allowWorkFromHome: false,

  isActive: true,
};

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

interface ToggleConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
  hint?: string;
}

/** `pTextarea` bypasses `FormField`, so these are bound by hand through `onTextareaInput`. */
type TextareaKey = 'description' | 'remark';

@Component({
  selector: 'app-attendance-policy-form',
  imports: [
    FormField,
    AutoFocusModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    SkeletonField,
    SkeletonToggle,
    ToggleField,
  ],
  templateUrl: './attendance-policy-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AttendancePolicyForm implements CanComponentDeactivate {
  readonly #attendancePolicyApi = inject(AttendancePolicyApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component. */
  protected readonly attendancePolicyId =
    Number(this.#route.snapshot.paramMap.get('attendancePolicyId')) || null;
  protected readonly isEditMode = this.attendancePolicyId !== null;

  protected readonly locationScopeOptions = ATTENDANCE_LOCATION_SCOPES;

  readonly #policyTypesResource = rxResource({
    stream: () =>
      this.#policyTypeApi.getPolicyTypeNames({ IsActive: true }).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as PolicyTypesName[]);
        }),
      ),
  });

  protected readonly policyTypes = computed(() => this.#policyTypesResource.value() ?? []);
  protected readonly isLoadingPolicyTypes = computed(() => this.#policyTypesResource.isLoading());

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<AttendancePolicyFormModel>(emptyModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<AttendancePolicyFormModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, attendancePolicySchema);
  });

  protected readonly approvalToggles: ToggleConfig[] = [
    {
      id: 'requireGeoFenceForOffice',
      label: 'Require geo-fence for office',
      field: this.f.requireGeoFenceForOffice,
      hint: 'Office punches must fall inside the location geo-fence',
    },
    {
      id: 'requireGpsForRemote',
      label: 'Require GPS for remote',
      field: this.f.requireGpsForRemote,
      hint: 'Remote punches must carry a GPS position',
    },
    {
      id: 'allowOutsideLocationWithApproval',
      label: 'Allow outside location with approval',
      field: this.f.allowOutsideLocationWithApproval,
      hint: 'Punches beyond the scope are accepted once approved',
    },
  ];

  protected readonly channelToggles: ToggleConfig[] = [
    {
      id: 'allowBiometric',
      label: 'Biometric',
      field: this.f.allowBiometric,
      hint: 'Punches from an enrolled device',
    },
    {
      id: 'allowMobile',
      label: 'Mobile',
      field: this.f.allowMobile,
      hint: 'Punches from the mobile app',
    },
    { id: 'allowWeb', label: 'Web', field: this.f.allowWeb, hint: 'Punches from the web app' },
    {
      id: 'allowManualAttendance',
      label: 'Manual attendance',
      field: this.f.allowManualAttendance,
      hint: 'An administrator can record attendance by hand',
    },
    {
      id: 'allowWorkFromHome',
      label: 'Work from home',
      field: this.f.allowWorkFromHome,
      hint: 'StaffMembers on this policy may work from home',
    },
  ];

  protected readonly isDirty = computed(
    () => JSON.stringify(this.model()) !== JSON.stringify(this.#baseline()),
  );

  canDeactivate(): boolean {
    return !this.isDirty();
  }

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  constructor() {
    this.#setPageHeaderInfo();

    if (this.attendancePolicyId) {
      this.#hydrate(this.attendancePolicyId);
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Attendance Policy' : 'Add Attendance Policy';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update how and from where staffMembers on this policy mark attendance'
        : 'Define how and from where staffMembers are allowed to mark attendance',
      pageIcon: 'pi pi-verified',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      { label: 'Attendance Policies', routerLink: '/app/policies/attendance-policies' },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: number): void {
    this.isLoading.set(true);

    this.#attendancePolicyApi
      .getAttendancePolicy(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const policy = res.isSucceeded ? res.data : null;
          if (!policy) {
            this.#commonService.showMessage(res.message || 'Policy not found', 'error');
            this.#leave();
            return;
          }
          this.#setModel(this.#toModel(policy));
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #toModel(policy: AttendancePolicyRow): AttendancePolicyFormModel {
    return {
      ...emptyModel,
      policyTypeId: policy.policyTypeId ?? null,
      policyName: policy.policyName ?? '',
      description: policy.description ?? '',
      remark: policy.remark ?? '',

      attendanceLocationScope: policy.attendanceLocationScope ?? null,
      requireGeoFenceForOffice: policy.requireGeoFenceForOffice ?? false,
      requireGpsForRemote: policy.requireGpsForRemote ?? false,
      allowOutsideLocationWithApproval: policy.allowOutsideLocationWithApproval ?? false,

      allowBiometric: policy.allowBiometric ?? false,
      allowMobile: policy.allowMobile ?? false,
      allowWeb: policy.allowWeb ?? false,
      allowManualAttendance: policy.allowManualAttendance ?? false,
      allowWorkFromHome: policy.allowWorkFromHome ?? false,

      isActive: policy.isActive ?? true,
    };
  }

  /**
   * `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   * value is written back by hand instead of through `[formField]`.
   */
  onTextareaInput(key: TextareaKey, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, [key]: value }));
    const field = this.f[key] as FieldTree<string>;
    field().markAsDirty();
    field().markAsTouched();
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoading()) {
      return;
    }

    // The button stays enabled while the form is invalid, so submitting is how the user asks
    // "what is wrong?" — reveal everything, then take them to the first field to fix.
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      this.#focusFirstInvalid();
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const request$: Observable<AttendanceConfigMutationRes> = this.attendancePolicyId
        ? this.#attendancePolicyApi.updateAttendancePolicy({ ...body, id: this.attendancePolicyId })
        : this.#attendancePolicyApi.addAttendancePolicy(body);

      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#leave();
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  /** The schema validates the model in place, so the request body is where trimming happens. */
  #buildRequest(value: AttendancePolicyFormModel): CreateAttendancePolicyReq {
    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      policyTypeId: value.policyTypeId ?? 0,
      policyName: nullable(value.policyName),
      description: nullable(value.description),
      remark: nullable(value.remark),

      attendanceLocationScope: (value.attendanceLocationScope ??
        AttendanceLocationScope.AssignedLocations) as AttendanceLocationScope,
      requireGeoFenceForOffice: value.requireGeoFenceForOffice,
      requireGpsForRemote: value.requireGpsForRemote,
      allowOutsideLocationWithApproval: value.allowOutsideLocationWithApproval,

      allowBiometric: value.allowBiometric,
      allowMobile: value.allowMobile,
      allowWeb: value.allowWeb,
      allowManualAttendance: value.allowManualAttendance,
      allowWorkFromHome: value.allowWorkFromHome,

      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#router.navigate(['/app/policies/attendance-policies']);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['policyTypeId', this.showError(this.f.policyTypeId)],
      ['policyName', this.showError(this.f.policyName)],
      ['description', this.showError(this.f.description)],
      ['remark', this.showError(this.f.remark)],
      ['attendanceLocationScope', this.showError(this.f.attendanceLocationScope)],
      ['requireGeoFenceForOffice', this.showError(this.f.requireGeoFenceForOffice)],
      ['requireGpsForRemote', this.showError(this.f.requireGpsForRemote)],
      ['allowBiometric', this.showError(this.f.allowBiometric)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: AttendancePolicyFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate(['/app/policies/attendance-policies']);
  }
}
