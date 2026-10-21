import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { describe, expect, it, vi } from 'vitest';

import { confirmStatusChange, statusRowActions } from './status-change';

describe('confirmStatusChange', () => {
  const confirmWith = (isActive: boolean, note?: string) => {
    const service = { confirm: vi.fn() } as unknown as ConfirmationService;
    confirmStatusChange(service, '<b>Library</b>', isActive, vi.fn(), note);
    return vi.mocked(service.confirm).mock.calls[0][0] as Confirmation;
  };

  it('escapes the name and appends the note only when deactivating', () => {
    expect(confirmWith(true, 'It goes away.').message).toBe(
      'Deactivate <strong>&lt;b&gt;Library&lt;/b&gt;</strong>? It goes away.',
    );
    expect(confirmWith(false, 'It goes away.').message).toBe(
      'Activate <strong>&lt;b&gt;Library&lt;/b&gt;</strong>?',
    );
  });

  it('uses a danger accept button to deactivate and a primary one to activate', () => {
    expect(confirmWith(true).acceptButtonStyleClass).toBe('p-button-danger');
    expect(confirmWith(false).acceptButtonStyleClass).toBe('p-button-primary');
  });
});

describe('statusRowActions', () => {
  const visible = (isActive: boolean, canDeactivate: boolean, canActivate: boolean) =>
    statusRowActions({
      isActive,
      canEdit: true,
      canDeactivate,
      canActivate,
      edit: vi.fn(),
      toggleActive: vi.fn(),
    })
      .filter((item) => item.visible)
      .map((item) => item.label);

  it('offers Deactivate for active rows and Activate for inactive ones, per permission', () => {
    expect(visible(true, true, true)).toEqual(['Edit', 'Deactivate']);
    expect(visible(true, false, true)).toEqual(['Edit']);
    expect(visible(false, true, true)).toEqual(['Edit', 'Activate']);
    expect(visible(false, true, false)).toEqual(['Edit']);
  });
});
