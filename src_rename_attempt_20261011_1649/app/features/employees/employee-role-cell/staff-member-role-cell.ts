import { A11yModule } from '@angular/cdk/a11y';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { RepositionOnResize } from '@shared/directives';
import { IStaffMember, Role, UserRole } from '@shared/interfaces';
import { CARD_OVERLAY_POSITIONS, closeOverlayOnScroll } from '@shared/utilities/overlay';

import { RolePopup } from '../role-popup/role-popup';

/** What the cell renders: a role name, a count of the roles behind it, or neither. */
interface RoleCellView {
  displayName: string;
  extraCount: number;
  secondaryNames: string;
  tooltip: string;
}

/**
 * A row can carry its roles four ways: the multi-role list a fresh assignment leaves behind, the
 * list payload's own `assignedRoles`, a flat `roleName` from the older payload, or nothing but a
 * role id on the summary — which only the cached options can name.
 *
 * Exported because the list page decides whether to render the Role column at all, and it has to
 * ask the same question the cell answers.
 */
export function resolveRoleDisplayName(staffMember: IStaffMember, cachedRoles: Role[]): string {
  if (staffMember.userRoles?.length) {
    const primary = staffMember.userRoles.find((role) => role.isPrimaryRole);
    if (primary) return primary.roleName;

    const activeRoles = staffMember.userRoles.filter((role) => role.isActive);
    return activeRoles.length === 1 ? activeRoles[0].roleName : '';
  }

  if (staffMember.assignedRoles?.length) return staffMember.assignedRoles[0].name;

  if (staffMember.roleName) return staffMember.roleName;

  const summaryRoleId = staffMember.summaryStaffMemberInfo?.roleId;
  if (!summaryRoleId) return '';

  return cachedRoles.find((role) => role.id === summaryRoleId)?.roleName ?? '';
}

@Component({
  selector: 'app-staffMember-role-cell',
  imports: [
    NgTemplateOutlet,
    TooltipModule,
    A11yModule,
    OverlayModule,
    RepositionOnResize,
    RolePopup,
  ],
  templateUrl: './staffMember-role-cell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberRoleCell {
  readonly staffMember = input.required<IStaffMember>();
  readonly userStaffMemberId = input.required<string>();
  /** StaffMember accounts see the same chip, but cannot open the assignment popup. */
  readonly canManage = input(false);
  readonly cachedRoles = input<Role[]>([]);

  readonly rolesLoaded = output<Role[]>();
  readonly rolesAssigned = output<UserRole[]>();

  protected readonly isOpen = signal(false);
  protected readonly cardOverlayPositions = CARD_OVERLAY_POSITIONS;
  protected readonly overlayScrollStrategy = inject(Overlay).scrollStrategies.noop();

  constructor() {
    closeOverlayOnScroll(
      () => this.close(),
      () => this.isOpen(),
    );
  }

  protected toggle() {
    this.isOpen.update((open) => !open);
  }

  protected close() {
    this.isOpen.set(false);
  }

  /**
   * The chip lives outside the overlay, so CDK reports a click on it as an outside click - before
   * the chip's own handler runs. Ignoring those leaves the toggle in charge.
   */
  protected onOutsideClick(event: MouseEvent, origin: HTMLElement) {
    if (!origin.contains(event.target as Node)) this.close();
  }

  protected readonly view = computed<RoleCellView>(() => {
    const staffMember = this.staffMember();
    const names = this.roleNames(staffMember);
    const displayName = resolveRoleDisplayName(staffMember, this.cachedRoles());

    return {
      displayName,
      // Roles hidden behind the chip: all of them when no name made it onto the chip itself.
      extraCount: names.length > 1 ? names.length - (displayName ? 1 : 0) : 0,
      secondaryNames: names.slice(1).join(', '),
      tooltip: names.length ? names.join(', ') : 'Click to assign roles',
    };
  });

  /**
   * Every role name the row carries, the one on the chip first. `assignedRoles` has no primary or
   * active flag, so its order stands in for one.
   */
  private roleNames(staffMember: IStaffMember): string[] {
    if (staffMember.userRoles?.length) {
      const activeRoles = staffMember.userRoles.filter((role) => role.isActive);
      const primary = activeRoles.find((role) => role.isPrimaryRole);
      if (!primary) return activeRoles.map((role) => role.roleName);

      return [
        primary.roleName,
        ...activeRoles.filter((role) => role !== primary).map((role) => role.roleName),
      ];
    }

    return staffMember.assignedRoles?.map((role) => role.name) ?? [];
  }
}
