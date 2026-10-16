/**
 * `InstitutionPolicy` is the compliance/document policy engine (see
 * docs/specs/INSTITUTION_POLICY/). Names are prefixed `InstitutionPolicy*` because
 * `shared/interfaces/policies/policy-type.ts` already owns the unprefixed
 * `PolicyType` for the unrelated leave/insurance policy-types feature.
 */
export interface InstitutionPolicyLookupOption {
  id: number;
  code: string;
  name: string;
}

export interface InstitutionPolicyRuleSettingOption {
  code: string;
  label: string;
  valueJson: string;
  order: number;
}

export interface InstitutionPolicyRuleSettingDependency {
  dependsOnCode: string;
  operatorCode: string;
  expectedValueJson: string;
  actionCode: string;
}

export interface InstitutionPolicyRuleSettingDefinition {
  code: string;
  name: string;
  dataTypeCode: 'BOOLEAN' | 'INTEGER' | 'DECIMAL' | 'STRING' | 'CODE';
  isRequired: boolean;
  allowMultiple: boolean;
  defaultValueJson?: string;
  minimumValue?: number;
  maximumValue?: number;
  regexPattern?: string;
  placeholder?: string;
  helpText?: string;
  order: number;
  options: InstitutionPolicyRuleSettingOption[];
  dependencies: InstitutionPolicyRuleSettingDependency[];
}

export interface InstitutionPolicyRuleDefinition {
  categoryCode: string;
  ruleTypeCode: string;
  ruleTypeName: string;
  isRequired: boolean;
  allowMultiple: boolean;
  order: number;
  settings: InstitutionPolicyRuleSettingDefinition[];
}

export interface InstitutionPolicyLookups {
  categories: InstitutionPolicyLookupOption[];
  statuses: InstitutionPolicyLookupOption[];
  ruleTypes: InstitutionPolicyLookupOption[];
  ruleDefinitions: InstitutionPolicyRuleDefinition[];
  documentTypes: InstitutionPolicyLookupOption[];
  /** Values are generated from the backend AttendanceLocationScope enum. */
  attendanceLocationScopes: InstitutionPolicyLookupOption[];
  leaveTypes: InstitutionPolicyLeaveType[];
}

export interface InstitutionPolicyLeaveType {
  id: number;
  name: string;
}

export interface GetInstitutionPolicyLookupsRequest {
  moduleId?: number;
  operationId?: number;
  isActive?: boolean | null;
}

export interface InstitutionPolicyLookupsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyLookups;
}

export interface InstitutionPolicyType {
  id: number;
  code: string;
  name: string;
  description?: string;
  categoryId: number;
  /** Stable backend category code used for rule filtering across environments. */
  categoryCode: string;
  currencyCode?: string;
  isActive: boolean;
  /** Client-only: drives the per-row spinner on the Active/Inactive toggle. */
  isUpdatingStatus?: boolean;
}

export interface GetInstitutionPolicyTypesRequest {
  moduleId?: number;
  operationId?: number;
  isActive?: boolean | null;
}

export interface GetInstitutionPolicyTypesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyType[];
}

export interface AddInstitutionPolicyTypeRequest {
  moduleId?: number;
  operationId?: number;
  policyTypeCode: string;
  policyName: string;
  description?: string;
  policyCategoryId: number;
  defaultCurrencyCode: string;
}

export interface UpdateInstitutionPolicyTypeRequest extends AddInstitutionPolicyTypeRequest {
  isActive: boolean;
}

export interface InstitutionPolicyTypeResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyType;
}

export interface UpdateInstitutionPolicyTypeStatusRequest {
  moduleId?: number;
  operationId?: number;
  isActive: boolean;
}

export interface InstitutionPolicyTypeStatusResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: boolean;
}
