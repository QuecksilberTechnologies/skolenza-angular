import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';

import { escapeHtml } from './escape-html';

/** Asks before activating or deactivating a record. `deactivateNote` follows the question. */
export function confirmStatusChange(
  confirmationService: ConfirmationService,
  name: string,
  isActive: boolean,
  accept: () => void,
  deactivateNote?: string,
): void {
  const action = isActive ? 'Deactivate' : 'Activate';
  confirmationService.confirm({
    // The dialog renders `message` via [innerHTML], so the record name is escaped before use.
    message: `${action} <strong>${escapeHtml(name)}</strong>?${
      isActive && deactivateNote ? ` ${deactivateNote}` : ''
    }`,
    header: `${action} this record`,
    icon: 'pi pi-exclamation-circle text-amber-500! text-2xl!',
    acceptLabel: action,
    rejectLabel: 'Cancel',
    acceptButtonStyleClass: isActive ? 'p-button-danger' : 'p-button-primary',
    rejectButtonStyleClass: 'p-button-secondary',
    accept,
  });
}

export interface StatusRowActionsOptions {
  isActive: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canActivate: boolean;
  edit: () => void;
  toggleActive: () => void;
}

/** Row-menu items for a record with an active flag: Edit, then Deactivate or Activate. */
export function statusRowActions({
  isActive,
  canEdit,
  canDeactivate,
  canActivate,
  edit,
  toggleActive,
}: StatusRowActionsOptions): MenuItem[] {
  return [
    { label: 'Edit', icon: 'pi pi-pencil', visible: canEdit, command: edit },
    isActive
      ? { label: 'Deactivate', icon: 'pi pi-ban', visible: canDeactivate, command: toggleActive }
      : {
          label: 'Activate',
          icon: 'pi pi-check-circle',
          visible: canActivate,
          command: toggleActive,
        },
  ];
}
