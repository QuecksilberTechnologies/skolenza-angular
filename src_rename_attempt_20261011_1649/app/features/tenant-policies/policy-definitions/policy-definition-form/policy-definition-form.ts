import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { applyEach, disabled, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

import { CanComponentDeactivate } from '@core/guards';
import { Common } from '@core/services';
import { CurrencyStore, FeaturePageStore, LookupStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormMultiSelect } from '@shared/components/form-inputs/form-multiselect/form-multiselect';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SectionCard } from '@shared/components/section-card/section-card';
import {
  AttendanceLocationScope,
  CreateInstitutionPolicyRequest,
  InstitutionPolicyApplicabilityInput,
  InstitutionPolicyDetail,
  InstitutionPolicyRuleInput,
} from '@shared/interfaces';
import { injectStaffMemberOptions } from '@shared/utilities/staffMember-filter-options';
import { fieldErrorMessage, showFieldError } from '@shared/utilities/field-error';
import {
  applicabilityDetailToInput,
  ruleDetailToInput,
} from '@shared/utilities/institution-policy-detail-mapping';

import { ymd } from '../../date-only';
import {
  DEFINITIONS_MODULE_CODE,
  POLICY_FORM_MODE_KEY,
  POLICY_LIST_ROUTE,
  PolicyFormMode,
} from '../../institution-policy-constants';
import { applicabilityStaffMemberTarget, targetsSavedStaffMember } from './applicability-staffMember';
import {
  ApplicabilityRowModel,
  PolicyDefinitionModel,
  policyDefinitionSchema,
  RuleRowModel,
} from './policy-definition-form.schema';
import { PolicyDefinitionFormStore, PolicyVersionTarget } from './policy-definition-form.store';
import { injectRowLocationCascade, LOCATION_LEVEL_KEYS } from './row-location-cascade';
import {
  newRuleSettingRow,
  parseRuleSettings,
  parseRuleSettingValue,
  RuleSettingRow,
  ruleSettingValueError,
  serializeRuleSettings,
  synchronizeAccrualAmount,
} from './rule-settings';

const APPLICABILITY_MODES = [
  { label: 'Include', value: 1 as const },
  { label: 'Exclude', value: 2 as const },
];

const newRuleRow = (): RuleRowModel => ({
  policyRuleTypeId: null,
  ruleName: '',
  settings: [],
  leaveTypeIds: [],
});

type AttendanceConfigurationModel = PolicyDefinitionModel['attendanceConfiguration'];

/** No reordering yet — a row's position is set on add and fixed until removed. `priority` is
 *  what actually orders applicability at resolution time; `ruleOrder` for rules is derived from
 *  array position only at submit. */
function newApplicabilityRow(effectiveFrom: Date | null): ApplicabilityRowModel {
  return {
    applicabilityMode: 1,
    countryId: null,
    stateId: null,
    campusId: null,
    staffEmploymentTypeId: null,
    priority: 500,
    effectiveFrom,
    effectiveTo: null,
    districtId: null,
    localityId: null,
    departmentId: null,
    designationId: null,
    staffMemberPublicId: null,
    savedStaffMemberId: null,
    genderId: null,
    workArrangementType: null,
    employmentStatus: null,
    minimumServiceDays: null,
    leaveTypeIds: [],
  };
}

/** The inverse of `ymd()`, built from the same local parts. `new Date('2027-01-01')` parses a
 *  date-only string as *UTC* midnight, so west of UTC the picker would show the previous day and
 *  an untouched field would round-trip one day earlier on every save. */
const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;

  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const normalizeCode = (value: string | null | undefined): string =>
  value?.trim().toUpperCase() ?? '';

/** `null` when either id fails to parse. Create and edit are separate route configs, so the
 *  target cannot change under the component. */
function versionTarget(route: ActivatedRoute): PolicyVersionTarget | null {
  const params = route.snapshot.paramMap;
  const policyId = Number(params.get('policyId'));
  const versionId = Number(params.get('versionId'));
  return policyId > 0 && versionId > 0 ? { policyId, versionId } : null;
}

@Component({
  selector: 'app-policy-definition-form',
  imports: [
    ButtonModule,
    MessageModule,
    FormActionBar,
    FormDate,
    FormNumber,
    FormMultiSelect,
    FormSelect,
    FormSwitch,
    FormText,
    FormTextarea,
    SectionCard,
    SkeletonField,
    SkeletonModule,
  ],
  providers: [PolicyDefinitionFormStore],
  templateUrl: './policy-definition-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyDefinitionForm implements CanComponentDeactivate {
  protected readonly store = inject(PolicyDefinitionFormStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);
  readonly #lookupStore = inject(LookupStore);
  readonly #currencyStore = inject(CurrencyStore);

  readonly #route = inject(ActivatedRoute);
  /** From the route config, never from whether the ids parse: a broken edit URL must not
   *  quietly become a create. */
  protected readonly isEditMode =
    (this.#route.snapshot.data[POLICY_FORM_MODE_KEY] as PolicyFormMode) === 'edit';

  protected readonly ruleTypes = computed(() => {
    const selectedType = this.store
      .policyTypes()
      .find((type) => Number(type.id) === Number(this.model().policyTypeId));
    if (!selectedType) return [];
    const categoryCode = selectedType.categoryCode;
    if (!categoryCode || this.store.ruleDefinitions().length === 0) return [];

    const normalizedCategoryCode = normalizeCode(categoryCode);
    const allowedCodes = new Set(
      this.store
        .ruleDefinitions()
        .filter((definition) => normalizeCode(definition.categoryCode) === normalizedCategoryCode)
        .map((definition) => normalizeCode(definition.ruleTypeCode)),
    );
    return this.store
      .ruleTypes()
      .filter((ruleType) => allowedCodes.has(normalizeCode(ruleType.code)));
  });
  protected readonly selectedLeaveTypes = computed(() => {
    const selected = new Set(this.model().leaveTypeIds);
    return this.store.leaveTypes().filter((item) => selected.has(item.id));
  });
  protected readonly applicabilityModes = APPLICABILITY_MODES;
  protected readonly targetsSavedStaffMember = targetsSavedStaffMember;
  protected readonly departments = this.#lookupStore.departmentOptions;
  protected readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  protected readonly countries = this.#lookupStore.countries;
  protected readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  protected readonly staffEmploymentTypes = this.#lookupStore.staffEmploymentTypes;
  protected readonly isLoadingStaffEmploymentTypes = this.#lookupStore.isLoadingStaffEmploymentTypes;
  protected readonly genders = this.#lookupStore.genders;
  protected readonly isLoadingGenders = this.#lookupStore.isLoadingGenders;
  protected readonly currencyOptions = this.#currencyStore.options;
  protected readonly isLoadingCurrencies = this.#currencyStore.isLoading;
  protected readonly submitted = signal(false);
  protected readonly isAttendancePolicy = computed(
    () => this.model().requiresAttendanceConfiguration,
  );
  protected readonly isLeavePolicy = computed(() => this.model().requiresLeaveTypeTargets);

  readonly #staffMembers = injectStaffMemberOptions();
  protected readonly isLoadingStaffMembers = this.#staffMembers.isLoading;
  protected readonly staffMemberOptions = this.#staffMembers.options;

  protected readonly model = signal<PolicyDefinitionModel>({
    policyTypeId: null,
    policyCode: '',
    policyName: '',
    summary: '',
    ownerDepartmentId: null,
    defaultCurrencyCode: 'INR',
    effectiveFrom: null,
    effectiveTo: null,
    changeSummary: this.isEditMode ? '' : 'Initial version',
    rules: [],
    applicability: [],
    leaveTypeIds: [],
    requiresLeaveTypeTargets: false,
    requiresAttendanceConfiguration: false,
    attendanceConfiguration: this.#defaultAttendanceConfiguration(),
  });
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal(this.model());

  protected readonly isDirty = computed(
    () => JSON.stringify(this.model()) !== JSON.stringify(this.#baseline()),
  );

  canDeactivate(): boolean {
    return !this.isDirty();
  }

  protected readonly locations = injectRowLocationCascade({
    applicability: () => this.model().applicability,
    patchApplicabilityRow: (index, patch) => this.#patchApplicabilityRow(index, patch),
    userStaffMemberId: () => this.store.getUserStaffMemberId(),
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, policyDefinitionSchema);

    // Each level of the location chain waits on the one above it.
    applyEach(p.applicability, (row) => {
      for (const { parentKey, ownKey } of Object.values(LOCATION_LEVEL_KEYS)) {
        disabled(row[ownKey], { when: ({ valueOf }) => !valueOf(row[parentKey]) });
      }
    });
  });

  /** The "at least one channel" issue lands on `allowBiometric`, and a switch has no message slot,
   *  so the group reports it — on the same schedule as every other field's error. */
  protected readonly channelErrorMessage = computed(() => {
    const field = this.f.attendanceConfiguration.allowBiometric;
    return showFieldError(field, this.submitted()) ? fieldErrorMessage(field) : undefined;
  });

  protected readonly channelSelection = linkedSignal(() => {
    const config = this.model().attendanceConfiguration;
    return [
      ...(config.allowWeb ? ['WEB'] : []),
      ...(config.allowMobile ? ['MOBILE'] : []),
      ...(config.allowBiometric ? ['BIOMETRIC'] : []),
      ...(config.allowManualAttendance ? ['MANUAL'] : []),
    ];
  });
  protected readonly channelField = form(this.channelSelection);
  protected readonly channelOptions = computed(() => {
    const type = this.store.ruleTypes().find((item) => item.code === 'ATTENDANCE_CHANNEL');
    return type ? this.ruleSettingOptions(Number(type.id), 'channelCode') : [];
  });

  constructor() {
    effect(() => {
      const current = this.model().rules;
      const rules = this.#withAccrualAmounts(current);
      if (rules !== current) this.model.update((model) => ({ ...model, rules }));
    });

    this.#setPageHeaderInfo();
    this.#load();
  }

  #load() {
    if (!this.isEditMode) {
      this.store.loadForCreate();
      return;
    }

    const target = versionTarget(this.#route);
    if (!target) {
      this.#leaveWithError('This policy link is not valid. Open the policy from the list.');
      return;
    }
    this.store.loadForEdit(target, {
      onLoaded: (detail) => this.#applyDetail(detail),
      onError: (message) => this.#leaveWithError(message),
    });
  }

  /** Recomputes each Accrual rule's derived amount; returns `rules` itself when nothing changed. */
  #withAccrualAmounts(rules: RuleRowModel[]): RuleRowModel[] {
    let changed = false;
    const next = rules.map((rule) => {
      const ruleTypeCode = this.store
        .ruleTypes()
        .find((item) => Number(item.id) === Number(rule.policyRuleTypeId))?.code;
      if (normalizeCode(ruleTypeCode) !== 'ACCRUAL') return rule;

      const settings = synchronizeAccrualAmount(rule.settings);
      if (settings === rule.settings) return rule;
      changed = true;
      return { ...rule, settings };
    });
    return changed ? next : rules;
  }

  #setPageHeaderInfo() {
    const listTitle = this.#featurePageStore.displayNameOf(DEFINITIONS_MODULE_CODE) ?? 'Policies';
    const pageTitle = this.isEditMode ? 'Edit Policy' : 'Create Policy';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update this policy draft, its rules and who it applies to'
        : 'Define a policy draft, its rules and who it applies to',
      pageIcon: 'pi pi-file-edit',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: listTitle, routerLink: POLICY_LIST_ROUTE },
      { label: pageTitle },
    ]);
  }

  isExecutionChannel(ruleTypeId: number | null, settingCode: string): boolean {
    return (
      this.isAttendancePolicy() &&
      settingCode === 'channelCode' &&
      this.store
        .ruleTypes()
        .some(
          (item) => Number(item.id) === Number(ruleTypeId) && item.code === 'ATTENDANCE_CHANNEL',
        )
    );
  }

  onChannelsChange() {
    const channels = this.channelSelection();
    this.model.update((model) => ({
      ...model,
      attendanceConfiguration: {
        ...model.attendanceConfiguration,
        allowWeb: channels.includes('WEB'),
        allowMobile: channels.includes('MOBILE'),
        allowBiometric: channels.includes('BIOMETRIC'),
        allowManualAttendance: channels.includes('MANUAL'),
      },
    }));
    this.#synchronizeChannelRules();
  }

  #synchronizeChannelRules() {
    const channels = this.channelSelection();
    this.model.update((model) => ({
      ...model,
      rules: model.rules.map((rule) => ({
        ...rule,
        settings: rule.settings.map((setting) =>
          this.isExecutionChannel(rule.policyRuleTypeId, setting.key)
            ? { ...setting, value: [...channels] }
            : setting,
        ),
      })),
    }));
  }

  #leaveWithError(message: string) {
    this.#commonService.showMessage(message, 'error');
    this.#leave();
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave() {
    this.#baseline.set(this.model());
    void this.#router.navigate([POLICY_LIST_ROUTE]);
  }

  #applyDetail(detail: InstitutionPolicyDetail) {
    const applicability: ApplicabilityRowModel[] = detail.applicability.map((row) => {
      const { staffMemberId, ...input } = applicabilityDetailToInput(row);
      return {
        ...input,
        staffMemberPublicId: null,
        savedStaffMemberId: staffMemberId,
        effectiveFrom: parseDate(input.effectiveFrom),
        effectiveTo: parseDate(input.effectiveTo),
      };
    });

    this.model.set({
      policyTypeId: detail.policyTypeId,
      policyCode: detail.code,
      policyName: detail.name,
      summary: detail.summary ?? '',
      ownerDepartmentId: detail.ownerDepartmentId,
      defaultCurrencyCode: detail.defaultCurrencyCode,
      effectiveFrom: parseDate(detail.effectiveFrom),
      effectiveTo: parseDate(detail.effectiveTo),
      changeSummary: '',
      rules: detail.rules.map((rule) => {
        const input = ruleDetailToInput(rule);
        return {
          policyRuleTypeId: input.policyRuleTypeId,
          ruleName: input.ruleName,
          settings: parseRuleSettings(input.ruleConfiguration),
          leaveTypeIds: input.leaveTypeIds ?? [],
        };
      }),
      applicability,
      leaveTypeIds: detail.leaveTypes?.map((item) => item.id) ?? [],
      requiresLeaveTypeTargets: this.#isLeavePolicyType(detail.policyTypeId),
      requiresAttendanceConfiguration: this.#isAttendancePolicyType(detail.policyTypeId),
      attendanceConfiguration:
        detail.attendanceConfiguration ?? this.#defaultAttendanceConfiguration(),
    });

    this.#synchronizeChannelRules();
    // Before the baseline, so the accrual effect finds nothing to change and an untouched draft
    // does not count as an unsaved edit.
    this.model.update((model) => ({ ...model, rules: this.#withAccrualAmounts(model.rules) }));
    this.#baseline.set(this.model());
    this.locations.loadSavedRows(applicability);
  }

  onPolicyTypeChange(policyTypeId: number | null) {
    const currency = this.store.policyTypes().find((t) => t.id === policyTypeId)?.currencyCode;
    const requiresAttendanceConfiguration = this.#isAttendancePolicyType(policyTypeId);
    const requiresLeaveTypeTargets = this.#isLeavePolicyType(policyTypeId);
    this.model.update((model) => ({
      ...model,
      rules: [],
      applicability: [],
      leaveTypeIds: [],
      requiresLeaveTypeTargets,
      ...(currency ? { defaultCurrencyCode: currency } : {}),
      requiresAttendanceConfiguration,
      attendanceConfiguration: {
        ...model.attendanceConfiguration,
        attendanceLocationScope:
          requiresAttendanceConfiguration &&
          model.attendanceConfiguration.attendanceLocationScope === null
            ? this.#defaultAttendanceLocationScope()
            : model.attendanceConfiguration.attendanceLocationScope,
      },
    }));
  }

  #defaultAttendanceConfiguration(): AttendanceConfigurationModel {
    return {
      attendanceLocationScope: this.#defaultAttendanceLocationScope(),
      allowBiometric: false,
      allowMobile: true,
      allowWeb: false,
      allowManualAttendance: false,
      allowWorkFromHome: false,
      requireGeoFenceForOffice: true,
      requireGpsForRemote: false,
      allowOutsideLocationWithApproval: false,
    };
  }

  /** Assigned Locations is selected by stable API code; its numeric value is never duplicated. */
  #defaultAttendanceLocationScope(): AttendanceLocationScope | null {
    return (
      (this.store.attendanceLocationScopes().find((option) => option.code === 'ASSIGNED_LOCATIONS')
        ?.id as AttendanceLocationScope | undefined) ?? null
    );
  }

  /** Category codes are seeded and stable; Policy Type ids are institution-generated. */
  #isAttendancePolicyType(policyTypeId: number | null): boolean {
    const selectedType = this.store.policyTypes().find((type) => type.id === policyTypeId);
    return normalizeCode(selectedType?.categoryCode) === 'ATTENDANCE';
  }

  #isLeavePolicyType(policyTypeId: number | null): boolean {
    const selectedType = this.store.policyTypes().find((type) => type.id === policyTypeId);
    return normalizeCode(selectedType?.categoryCode) === 'LEAVE';
  }

  addRuleRow() {
    if (!this.model().policyTypeId) {
      this.#commonService.showMessage('Select a policy type before adding rules.', 'info');
      return;
    }
    this.model.update((m) => ({
      ...m,
      rules: [...m.rules, { ...newRuleRow(), leaveTypeIds: [...m.leaveTypeIds] }],
    }));
  }

  onRuleTypeChange(ruleIndex: number, ruleTypeId: number | null) {
    const settings =
      this.#ruleDefinitionFor(ruleTypeId)?.settings.map((setting) => ({
        key: setting.code,
        value: parseRuleSettingValue(setting.defaultValueJson),
      })) ?? [];
    this.#updateRuleSettings(ruleIndex, () => settings);
    this.#synchronizeChannelRules();
  }

  #ruleDefinitionFor(ruleTypeId: number | null) {
    const ruleTypeCode = this.store
      .ruleTypes()
      .find((item) => Number(item.id) === Number(ruleTypeId))?.code;
    return this.store
      .ruleDefinitions()
      .find((item) => normalizeCode(item.ruleTypeCode) === normalizeCode(ruleTypeCode));
  }

  ruleSettingDefinition(ruleTypeId: number | null, settingCode: string) {
    return this.#ruleDefinitionFor(ruleTypeId)?.settings.find(
      (setting) => normalizeCode(setting.code) === normalizeCode(settingCode),
    );
  }

  ruleSettingOptions(ruleTypeId: number | null, settingCode: string) {
    return (
      this.ruleSettingDefinition(ruleTypeId, settingCode)?.options.map((option) => ({
        label: option.label,
        value: parseRuleSettingValue(option.valueJson),
      })) ?? []
    );
  }

  ruleSettingError(ruleTypeId: number | null, settingCode: string, value: unknown) {
    if (!this.submitted()) return undefined;
    return ruleSettingValueError(this.ruleSettingDefinition(ruleTypeId, settingCode), value);
  }

  isCalculatedAccrualAmount(ruleTypeId: number | null, settingCode: string): boolean {
    const ruleTypeCode = this.store
      .ruleTypes()
      .find((item) => Number(item.id) === Number(ruleTypeId))?.code;
    return normalizeCode(ruleTypeCode) === 'ACCRUAL' && settingCode === 'amountPerCycle';
  }

  #hasRuleSettingErrors(): boolean {
    return this.model().rules.some((rule) =>
      rule.settings.some((setting) =>
        Boolean(this.ruleSettingError(rule.policyRuleTypeId, setting.key, setting.value)),
      ),
    );
  }

  removeRuleRow(index: number) {
    this.model.update((m) => ({ ...m, rules: m.rules.filter((_, i) => i !== index) }));
  }

  addRuleSetting(ruleIndex: number) {
    this.#updateRuleSettings(ruleIndex, (settings) => [...settings, newRuleSettingRow()]);
  }

  removeRuleSetting(ruleIndex: number, settingIndex: number) {
    this.#updateRuleSettings(ruleIndex, (settings) =>
      settings.filter((_, i) => i !== settingIndex),
    );
  }

  #updateRuleSettings(ruleIndex: number, change: (settings: RuleSettingRow[]) => RuleSettingRow[]) {
    this.model.update((m) => ({
      ...m,
      rules: m.rules.map((rule, i) =>
        i === ruleIndex ? { ...rule, settings: change(rule.settings) } : rule,
      ),
    }));
  }

  addApplicabilityRow() {
    this.model.update((m) => ({
      ...m,
      applicability: [
        ...m.applicability,
        { ...newApplicabilityRow(m.effectiveFrom), leaveTypeIds: [...m.leaveTypeIds] },
      ],
    }));
    this.locations.addRow();
  }

  removeApplicabilityRow(index: number) {
    this.model.update((m) => ({
      ...m,
      applicability: m.applicability.filter((_, i) => i !== index),
    }));
    this.locations.removeRow(index);
  }

  /** Drops the staffMember the row was saved with. Called by the Remove button and by any change to the
   *  staffMember select, so a pick replaces it and clearing after a pick leaves any staffMember. */
  clearSavedStaffMember(index: number) {
    this.#patchApplicabilityRow(index, { savedStaffMemberId: null });
  }

  #patchApplicabilityRow(index: number, patch: Partial<ApplicabilityRowModel>) {
    this.model.update((m) => ({
      ...m,
      applicability: m.applicability.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  onSubmit() {
    if (this.store.isSaving() || this.store.isLoading()) return;
    this.#synchronizeChannelRules();
    this.submitted.set(true);
    if (this.#hasRuleSettingErrors()) return;

    submit(this.f, async () => {
      this.store.save(this.#toRequestBody(), () => this.#leave());
    });
  }

  /** Only called from `submit()`, so the schema's `.refine()`s have passed — hence the `!`s: the
   *  refines narrow null out of the *output* type, while the model keeps the nullable input type. */
  #toRequestBody(): CreateInstitutionPolicyRequest {
    const value = this.model();
    const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
      [DEFINITIONS_MODULE_CODE],
      this.isEditMode ? 'Update' : 'Add',
    );

    const rules: InstitutionPolicyRuleInput[] = value.rules.map((row, index) => ({
      policyRuleTypeId: row.policyRuleTypeId!,
      ruleName: row.ruleName.trim(),
      ruleOrder: index + 1,
      ruleConfiguration: serializeRuleSettings(row.settings),
      leaveTypeIds: row.leaveTypeIds,
    }));

    // Explicit fields, not a `...row` spread, for the same nullable-input reason as above.
    const applicability: InstitutionPolicyApplicabilityInput[] = value.applicability.map((row) => ({
      applicabilityMode: row.applicabilityMode,
      countryId: row.countryId,
      stateId: row.stateId,
      campusId: row.campusId,
      staffEmploymentTypeId: row.staffEmploymentTypeId,
      districtId: row.districtId,
      localityId: row.localityId,
      departmentId: row.departmentId,
      designationId: row.designationId,
      ...applicabilityStaffMemberTarget(row),
      genderId: row.genderId,
      workArrangementType: row.workArrangementType,
      employmentStatus: row.employmentStatus,
      minimumServiceDays: row.minimumServiceDays,
      priority: row.priority!,
      effectiveFrom: ymd(row.effectiveFrom)!,
      effectiveTo: ymd(row.effectiveTo),
      leaveTypeIds: row.leaveTypeIds,
    }));

    return {
      moduleId: ModuleId,
      operationId: OperationId,
      policyTypeId: value.policyTypeId!,
      policyCode: value.policyCode.trim(),
      policyName: value.policyName.trim(),
      summary: value.summary.trim(),
      ownerDepartmentId: value.ownerDepartmentId,
      defaultCurrencyCode: value.defaultCurrencyCode,
      effectiveFrom: ymd(value.effectiveFrom)!,
      effectiveTo: ymd(value.effectiveTo),
      changeSummary: value.changeSummary.trim(),
      rules,
      applicability,
      leaveTypeIds: value.leaveTypeIds,
      attendanceConfiguration: this.isAttendancePolicy()
        ? {
            ...value.attendanceConfiguration,
            attendanceLocationScope: value.attendanceConfiguration.attendanceLocationScope!,
          }
        : null,
    };
  }

  onCancel() {
    void this.#router.navigate([POLICY_LIST_ROUTE]);
  }
}
