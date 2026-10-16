import { computed, inject, Signal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { RolesApi } from '@core/services/roles-api';
import { StaffProfessionalStructureApi } from '@core/services/staff-professional-structure-api';
import { LookupStore } from '@core/stores/lookup.store';
import { BulkImportFieldConfig, BulkImportFieldOption } from '@shared/interfaces';

const PERSONAL = 'Personal information';
const ORGANIZATION = 'Organization details';
const ADDITIONAL = 'Additional information';

/**
 * How the bulk-import fix editor renders an StaffMember row.
 *
 * Kept out of `staffMembers.ts`, which is long enough, and out of the dialog, which must stay ignorant
 * of which master it is importing — the lists below come from this feature's own lookups, and the
 * shared dialog only ever sees the signals they are handed as.
 *
 * Costs nothing to build: `layout.ts` initialises `LookupStore` on every institution session, so
 * countries, genders, staffMember types and departments are already resolved by the time the list
 * renders. Positions, roles, states and districts are fetched on demand, which for the first two
 * means the first time the editor opens rather than whenever the wizard does.
 *
 * Must be called from an injection context. `userStaffMemberId` is read at fetch time rather than
 * taken by value: the fields are built when the list component is constructed, and the login info
 * that carries the id is only resolved a tick later.
 */
export function staffMemberImportFields(
  userStaffMemberId: () => string,
): readonly BulkImportFieldConfig[] {
  const lookup = inject(LookupStore);
  const professionalApi = inject(StaffProfessionalStructureApi);
  const rolesApi = inject(RolesApi);

  const categoryId = signal('');
  const categoriesWanted = signal(false);
  const categories = rxResource({
    params: () => (categoriesWanted() ? {} : undefined),
    stream: () =>
      professionalApi
        .getCategories()
        .pipe(map((response) => (response.isSucceeded ? response.data : []))),
    defaultValue: [],
  });

  const positions = rxResource({
    params: () => {
      const id = Number(categoryId());

      return id ? { id } : undefined;
    },
    stream: ({ params }) =>
      professionalApi
        .getPositions(params.id)
        .pipe(map((response) => (response.isSucceeded ? response.data : []))),
    defaultValue: [],
  });

  /** One list for the whole institution, so it is fetched once the editor asks for it and then held. */
  const rolesWanted = signal(false);

  const roles = rxResource({
    params: () => (rolesWanted() ? {} : undefined),
    stream: () =>
      rolesApi
        .getRoleOptions({ UserStaffMemberId: userStaffMemberId(), IsActive: true })
        .pipe(map((response) => (response.isSucceeded ? response.data : []))),
    defaultValue: [],
  });

  /** The lookups answer typed rows; the editor only needs `id` plus the name it labels with. */
  const options = <T>(source: Signal<readonly T[]>) =>
    computed(() => source() as readonly BulkImportFieldOption[]);

  return [
    // ── Personal information ──────────────────────────────────────────────
    { column: 'StaffMemberCode', label: 'Staff member code', section: PERSONAL, required: true },
    { column: 'FirstName', label: 'First name', section: PERSONAL, required: true },
    { column: 'MiddleName', label: 'Middle name', section: PERSONAL },
    { column: 'LastName', label: 'Last name', section: PERSONAL, required: true },
    {
      column: 'OfficialEmail',
      label: 'Official email',
      section: PERSONAL,
      type: 'email',
      required: true,
    },
    {
      column: 'MobileNumber',
      label: 'Mobile number',
      section: PERSONAL,
      type: 'tel',
      hint: '10 digit number',
    },
    {
      column: 'DateOfBirth',
      label: 'Date of birth',
      section: PERSONAL,
      type: 'date',
      required: true,
    },
    {
      column: 'GenderId',
      label: 'Gender',
      section: PERSONAL,
      type: 'select',
      required: true,
      options: options(lookup.genders),
      optionLabel: 'genderName',
      optionsLoading: lookup.isLoadingGenders,
    },
    {
      column: 'CountryId',
      label: 'Country',
      section: PERSONAL,
      type: 'select',
      required: true,
      options: options(lookup.countries),
      optionLabel: 'countryName',
      optionsLoading: lookup.isLoadingCountries,
    },

    // ── Organization details ──────────────────────────────────────────────
    {
      column: 'DateOfOnBoarding',
      label: 'Date of onboarding',
      section: ORGANIZATION,
      type: 'date',
      required: true,
    },
    {
      column: 'DepartmentId',
      label: 'Department',
      section: ORGANIZATION,
      type: 'select',
      required: true,
      options: options(lookup.departmentOptions),
      optionLabel: 'departmentName',
      optionsLoading: lookup.isLoadingDepartmentOptions,
    },
    {
      column: 'InstitutionStaffCategoryMasterId',
      label: 'Staff category',
      section: ORGANIZATION,
      type: 'select',
      required: true,
      loadOptions: () => categoriesWanted.set(true),
      options: options(categories.value),
      optionLabel: 'name',
      optionsLoading: categories.isLoading,
    },
    {
      column: 'StaffPositionMasterId',
      label: 'Position',
      section: ORGANIZATION,
      type: 'select',
      required: true,
      dependsOn: 'InstitutionStaffCategoryMasterId',
      loadOptions: (value) => categoryId.set(value),
      options: options(positions.value),
      optionLabel: 'name',
      optionsLoading: positions.isLoading,
    },
    {
      column: 'StaffEmploymentTypeId',
      label: 'Staff employment type',
      section: ORGANIZATION,
      type: 'select',
      required: true,
      options: options(lookup.staffEmploymentTypes),
      optionLabel: 'typeName',
      optionsLoading: lookup.isLoadingStaffEmploymentTypes,
    },
    {
      column: 'RoleId',
      label: 'Role',
      section: ORGANIZATION,
      type: 'select',
      hint: 'Left blank, the Staff role is used',
      // No parent to hang off, so `loadOptions` is only ever the editor saying it is open.
      loadOptions: () => rolesWanted.set(true),
      options: options(roles.value),
      optionLabel: 'roleName',
      optionsLoading: roles.isLoading,
    },
    {
      column: 'HasPermanent',
      label: 'Has permanent address',
      section: ORGANIZATION,
      type: 'switch',
    },
    { column: 'IsActive', label: 'Is active', section: ORGANIZATION, type: 'switch' },

    // ── Additional information ────────────────────────────────────────────
    { column: 'ContactName', label: 'Contact name', section: ADDITIONAL },
    {
      column: 'ContactNumber',
      label: 'Contact number',
      section: ADDITIONAL,
      type: 'tel',
      hint: 'Required once any contact or address column is filled',
    },
    { column: 'AlternateNumber', label: 'Alternate number', section: ADDITIONAL, type: 'tel' },
    { column: 'ContactEmail', label: 'Alternate email', section: ADDITIONAL, type: 'email' },
    {
      column: 'ContactCountryId',
      label: 'Contact country',
      section: ADDITIONAL,
      type: 'select',
      options: options(lookup.countries),
      optionLabel: 'countryName',
      optionsLoading: lookup.isLoadingCountries,
    },
    {
      column: 'StateId',
      label: 'State',
      section: ADDITIONAL,
      type: 'select',
      dependsOn: 'CountryId',
      loadOptions: (value) => lookup.loadStates(Number(value) || undefined),
      options: options(lookup.states),
      optionsLoading: lookup.isLoadingStates,
      optionLabel: 'stateName',
    },
    {
      column: 'DistrictId',
      label: 'District',
      section: ADDITIONAL,
      type: 'select',
      dependsOn: 'StateId',
      loadOptions: (value) => lookup.loadDistricts(Number(value) || undefined),
      options: options(lookup.districts),
      optionsLoading: lookup.isLoadingDistricts,
      optionLabel: 'districtName',
    },
    { column: 'HouseNo', label: 'House no', section: ADDITIONAL },
    { column: 'Street', label: 'Street', section: ADDITIONAL },
    { column: 'LandMark', label: 'Landmark', section: ADDITIONAL },
    { column: 'Address', label: 'Address', section: ADDITIONAL },
  ];
}
