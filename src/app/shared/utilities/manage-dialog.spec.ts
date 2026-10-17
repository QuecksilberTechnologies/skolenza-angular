import { DestroyRef } from '@angular/core';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { openManageDialog } from './manage-dialog';

class FakeDestroyRef {
  readonly callbacks = new Set<() => void>();
  onDestroy(callback: () => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
}

function setup(titleId?: string) {
  const onClose = new Subject<boolean | undefined>();
  const ref = { onClose, close: vi.fn(() => onClose.next(undefined)) };
  const dialogService = { open: vi.fn(() => ref) } as unknown as DialogService;
  const destroyRef = new FakeDestroyRef();
  const onSaved = vi.fn();
  openManageDialog(
    dialogService,
    destroyRef as unknown as DestroyRef,
    { component: class {}, header: 'Add Thing', maxWidth: '36rem', data: { id: 1 }, titleId },
    onSaved,
  );
  return { onClose, ref, dialogService, destroyRef, onSaved };
}

describe('openManageDialog', () => {
  it('opens with the shared dialog options', () => {
    const { dialogService } = setup();

    expect(dialogService.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        header: 'Add Thing',
        style: { width: '90vw', maxWidth: '36rem' },
        modal: true,
        data: { id: 1 },
      }),
    );
  });

  it('hides the built-in header when the component titles itself', () => {
    const { dialogService } = setup('thing-title');

    expect(dialogService.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        showHeader: false,
        ariaLabelledBy: 'thing-title',
        contentStyle: { overflow: 'hidden', display: 'flex', flexDirection: 'column' },
      }),
    );
  });

  it('runs onSaved only when the dialog closes with true', () => {
    const saved = setup();
    saved.onClose.next(true);
    expect(saved.onSaved).toHaveBeenCalledOnce();

    const cancelled = setup();
    cancelled.onClose.next(undefined);
    expect(cancelled.onSaved).not.toHaveBeenCalled();
  });

  it('removes its destroy hook once the dialog closes', () => {
    const { onClose, destroyRef } = setup();
    expect(destroyRef.callbacks.size).toBe(1);

    onClose.next(undefined);

    expect(destroyRef.callbacks.size).toBe(0);
  });

  it('closes a still-open dialog when the host is destroyed', () => {
    const { ref, destroyRef, onSaved } = setup();

    destroyRef.callbacks.forEach((callback) => callback());

    expect(ref.close).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
