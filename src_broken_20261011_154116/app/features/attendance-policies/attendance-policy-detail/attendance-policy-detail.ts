import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { AttendancePolicyRow } from '@shared/interfaces';
import { ATTENDANCE_LOCATION_SCOPES } from '@shared/utilities/common-data';

interface DetailItem {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : `${value}`;

const yesNo = (value: boolean | null | undefined): string => (value ? 'Yes' : 'No');

/** Read-only policy summary for the row detail sheet. */
@Component({
  selector: 'app-attendance-policy-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './attendance-policy-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePolicyDetail {
  readonly policy = input<AttendancePolicyRow | undefined>();
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  protected readonly locationScopeLabel = computed(
    () =>
      ATTENDANCE_LOCATION_SCOPES.find(
        (scope) => scope.id === this.policy()?.attendanceLocationScope,
      )?.label ?? '—',
  );

  protected readonly sections = computed<DetailSection[]>(() => {
    const policy = this.policy();
    if (!policy) {
      return [];
    }

    return [
      {
        title: 'Policy',
        items: [
          { label: 'Policy Name', value: text(policy.policyName) },
          { label: 'Policy Type', value: text(policy.policyTypeName) },
          { label: 'Description', value: text(policy.description) },
          { label: 'Remark', value: text(policy.remark) },
        ],
      },
      {
        title: 'Location Scope',
        items: [{ label: 'Attendance Location Scope', value: this.locationScopeLabel() }],
      },
      {
        title: 'Allowed Channels',
        items: [
          { label: 'Biometric', value: yesNo(policy.allowBiometric) },
          { label: 'Mobile', value: yesNo(policy.allowMobile) },
          { label: 'Web', value: yesNo(policy.allowWeb) },
          { label: 'Manual Attendance', value: yesNo(policy.allowManualAttendance) },
          { label: 'Work From Home', value: yesNo(policy.allowWorkFromHome) },
        ],
      },
      {
        title: 'Approval Rules',
        items: [
          { label: 'Geo-fence Required for Office', value: yesNo(policy.requireGeoFenceForOffice) },
          { label: 'GPS Required for Remote', value: yesNo(policy.requireGpsForRemote) },
          {
            label: 'Outside Location with Approval',
            value: yesNo(policy.allowOutsideLocationWithApproval),
          },
        ],
      },
      {
        title: 'Audit',
        items: [
          { label: 'Added On', value: text(policy.addedDateTime) },
          { label: 'Updated On', value: text(policy.updatedDateTime) },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onEdit() {
    this.edit.emit();
  }
}
