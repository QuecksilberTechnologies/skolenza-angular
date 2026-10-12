import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { forkJoin, finalize } from 'rxjs';

import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { Common, RolesApi } from '@core/services';
import {
  GetAllUserRolesReq,
  GetAllUserRolesRes,
  GetRoleOptionReq,
  GetRolesResponse,
  IStaffMember,
  Role,
  UserRole,
} from '@shared/interfaces';

const MAX_ROLES = 3;
const SUPER_ADMIN_ROLE_NAME = 'superadmin';

/**
 * Institutions spell the role "Super Admin", "Super-Admin" or "SuperAdmin", so the letters are the only
 * stable part of the name. An exact match against one spelling silently disables every rule below.
 */
const isSuperAdmin = (roleName: string) =>
  roleName.replace(/[^a-z0-9]/gi, '').toLowerCase() === SUPER_ADMIN_ROLE_NAME;

@Component({
  selector: 'app-role-popup',
  imports: [
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './role-popup.html',
  styleUrl: './role-popup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePopup implements OnInit {
  readonly #rolesApi = inject(RolesApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  readonly staffMember = input.required<IStaffMember>();
  readonly userStaffMemberId = input.required<string>();
  readonly initialRoles = input<Role[]>([]);

  readonly rolesLoaded = output<Role[]>();
  readonly rolesAssigned = output<UserRole[]>();
  readonly closed = output<void>();

  readonly isLoading = signal(false);
  /** Seeded from the list's cache, then replaced by whatever the options request returns. */
  readonly roles = linkedSignal<Role[], Role[]>({
    source: this.initialRoles,
    computation: (incoming, previous) =>
      incoming.length ? incoming : (previous?.value ?? []),
  });
  readonly searchTerm = signal('');
  readonly selectedRoles = signal<UserRole[]>([]);
  readonly existingUserRoles = signal<UserRole[]>([]);

  readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.roles();
    if (!term) return all;
    return all.filter((r) => r.roleName.toLowerCase().includes(term));
  });

  /** The primary role from existing user roles */
  readonly primaryUserRole = computed(() => {
    return this.existingUserRoles().find((ur) => ur.isPrimaryRole) ?? null;
  });

  /** Whether the staff member's primary role is the Institution Administrator type. */
  readonly isPrimaryAdmin = computed(() => {
    const primary = this.primaryUserRole();
    return primary
      ? primary.roleType === InstitutionRoleTypeId.InstitutionAdministrator
      : false;
  });

  /** Whether Super Admin is currently selected */
  readonly hasSuperAdminSelected = computed(() =>
    this.selectedRoles().some((r) => isSuperAdmin(r.roleName)),
  );

  /** Whether multi-select is allowed */
  readonly isMultiSelectAllowed = computed(
    () => !this.isPrimaryAdmin() && !this.hasSuperAdminSelected(),
  );

  /** Whether the save button should be enabled */
  readonly canSave = computed(() => {
    const selected = this.selectedRoles();
    const existing = this.existingUserRoles();
    if (selected.length === 0) return false;

    // Check if selection actually changed
    const selectedIds = selected.map((r) => r.roleId).sort((a, b) => a - b);
    const existingIds = existing
      .filter((r) => r.isActive)
      .map((r) => r.roleId)
      .sort((a, b) => a - b);

    if (selectedIds.length !== existingIds.length) return true;
    return selectedIds.some((id, i) => id !== existingIds[i]);
  });

  /**
   * Every role is locked, so the popup can only explain itself: no search to run, nothing to save.
   */
  readonly isReadOnly = computed(() => {
    const roles = this.roles();
    return roles.length > 0 && roles.every((role) => this.isRoleDisabled(role));
  });

  /** The roles the staffMember holds, all the read-only view has to show. */
  readonly heldRoles = computed(() =>
    this.existingUserRoles().filter((role) => role.isActive),
  );

  /** Why Save is off, for the footer. Empty once it is on. */
  readonly saveHint = computed(() => {
    if (this.canSave()) return '';
    return this.selectedRoles().length === 0
      ? 'Select at least one role'
      : 'No changes to save';
  });

  /** How many more roles can be selected */
  readonly remainingSlots = computed(() => {
    if (!this.isMultiSelectAllowed()) return 0;
    return MAX_ROLES - this.selectedRoles().length;
  });

  readonly maxRoles = MAX_ROLES;

  ngOnInit() {
    this.loadRolesAndAssignments();
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  isRoleSelected(roleId: number): boolean {
    return this.selectedRoles().some((r) => r.roleId === roleId);
  }

  isPrimaryRole(roleId: number): boolean {
    const primary = this.primaryUserRole();
    return primary ? primary.roleId === roleId : false;
  }

  isRoleDisabled(role: Role): boolean {
    // An already-selected role stays clickable so it can be deselected.
    if (this.isRoleSelected(role.id) && !this.isPrimaryRole(role.id))
      return false;

    return this.getLockReason(role) !== '';
  }

  getDisabledTooltip(role: Role): string {
    return this.getLockReason(role);
  }

  /** Why this role cannot be picked right now; an empty string means it can. */
  private getLockReason(role: Role): string {
    if (this.isPrimaryRole(role.id)) {
      return 'Primary role cannot be changed from here';
    }
    if (this.hasSuperAdminSelected()) {
      return 'Super Admin does not allow additional roles';
    }
    if (this.isPrimaryAdmin()) {
      return 'Admin role does not allow multiple roles';
    }
    if (isSuperAdmin(role.roleName) && this.selectedRoles().length > 0) {
      return 'Super Admin can only be the sole role';
    }
    if (this.selectedRoles().length >= MAX_ROLES) {
      return `Maximum ${MAX_ROLES} roles allowed`;
    }
    if (role.roleType === InstitutionRoleTypeId.InstitutionAdministrator) {
      return 'Admin roles cannot be added as secondary roles';
    }
    return '';
  }

  onToggleRole(role: Role) {
    if (this.isRoleDisabled(role)) return;

    const current = [...this.selectedRoles()];
    const existingIndex = current.findIndex((r) => r.roleId === role.id);

    if (existingIndex > -1) {
      // Deselect
      current.splice(existingIndex, 1);
    } else {
      // Select — if Super Admin, replace all non-primary
      if (isSuperAdmin(role.roleName)) {
        const primaryOnly = current.filter((r) => r.isPrimaryRole);
        primaryOnly.push(this.toUserRole(role, false));
        this.selectedRoles.set(primaryOnly);
        return;
      }

      current.push(this.toUserRole(role, false));
    }

    this.selectedRoles.set(current);
  }

  onSave() {
    const selected = this.selectedRoles();
    if (selected.length === 0) return;

    // Emit selected roles to parent — parent handles the API call
    // so the HTTP request survives this component's destruction (CDK menu closes)
    this.rolesAssigned.emit(selected.map((r) => ({ ...r, isActive: true })));
  }

  private loadRolesAndAssignments() {
    const staffMember = this.staffMember();
    this.isLoading.set(true);

    const roleOptionsReq: GetRoleOptionReq = {
      UserStaffMemberId: this.userStaffMemberId(),
      IsActive: true,
    };

    const userRolesReq: GetAllUserRolesReq = {
      StaffMemberId: staffMember.staffMemberId,
    };

    const roleOptions$ = this.#rolesApi.getRoleOptions(roleOptionsReq);
    const userRoles$ = this.#rolesApi.getAllUserRoles(userRolesReq);

    forkJoin({
      roleOptions: roleOptions$,
      userRoles: userRoles$,
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res: {
          roleOptions: GetRolesResponse;
          userRoles: GetAllUserRolesRes;
        }) => {
          if (res.roleOptions.isSucceeded) {
            this.roles.set(res.roleOptions.data);
            this.rolesLoaded.emit(res.roleOptions.data);
          } else {
            this.#commonService.showMessage(res.roleOptions.message, 'error');
          }

          if (res.userRoles.isSucceeded) {
            const userRoles = res.userRoles.data ?? [];
            this.existingUserRoles.set(userRoles);
            this.selectedRoles.set(
              userRoles.filter((r: UserRole) => r.isActive),
            );
          } else {
            this.#commonService.showMessage(res.userRoles.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  private toUserRole(role: Role, isPrimary: boolean): UserRole {
    return {
      roleName: role.roleName,
      userRoleId: 0,
      roleId: role.id,
      isActive: true,
      isPrimaryRole: isPrimary,
      roleType: role.roleType,
    };
  }
}
