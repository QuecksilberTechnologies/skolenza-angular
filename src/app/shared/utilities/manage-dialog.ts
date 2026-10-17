import { DestroyRef, Type } from '@angular/core';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { take } from 'rxjs';

export interface ManageDialogOptions {
  component: Type<unknown>;
  header: string;
  maxWidth: string;
  data: unknown;
}

/**
 * Opens an add/edit dialog and runs `onSaved` when it closes with `true`. The dialog is closed if
 * the host is destroyed first; that hook is removed again when the dialog closes, so repeated
 * opens do not pile up callbacks on the host.
 */
export function openManageDialog(
  dialogService: DialogService,
  destroyRef: DestroyRef,
  { component, header, maxWidth, data }: ManageDialogOptions,
  onSaved: () => void,
): void {
  const ref = dialogService.open(component, {
    header,
    style: { width: '90vw', maxWidth },
    modal: true,
    closable: true,
    focusOnShow: false,
    data,
  });
  if (!ref) return;
  const unregister = destroyRef.onDestroy(() => ref.close());
  ref.onClose.pipe(take(1)).subscribe((saved?: boolean) => {
    unregister();
    if (saved) onSaved();
  });
}
