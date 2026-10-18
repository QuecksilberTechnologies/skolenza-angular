import { DestroyRef, Type } from '@angular/core';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { take } from 'rxjs';

export interface ManageDialogOptions {
  component: Type<unknown>;
  header: string;
  maxWidth: string;
  data: unknown;
  /**
   * Set when the component draws its own header, close button and scroll region: the built-in
   * header is hidden and the dialog is labelled by this element id instead.
   */
  titleId?: string;
}

/**
 * Opens an add/edit dialog and runs `onSaved` with the close value when it closes with a truthy
 * one (`true`, or whatever the dialog reports about the save). The dialog is closed if
 * the host is destroyed first; that hook is removed again when the dialog closes, so repeated
 * opens do not pile up callbacks on the host.
 */
export function openManageDialog<R = true>(
  dialogService: DialogService,
  destroyRef: DestroyRef,
  { component, header, maxWidth, data, titleId }: ManageDialogOptions,
  onSaved: (result: R) => void,
): void {
  const ref = dialogService.open(component, {
    header,
    style: { width: '90vw', maxWidth },
    modal: true,
    closable: true,
    focusOnShow: false,
    data,
    ...(titleId && {
      showHeader: false,
      ariaLabelledBy: titleId,
      // A flex column, so the component's scroll region can shrink to the dialog's max height.
      contentStyle: { overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    }),
  });
  if (!ref) return;
  const unregister = destroyRef.onDestroy(() => ref.close());
  ref.onClose.pipe(take(1)).subscribe((saved?: R) => {
    unregister();
    if (saved) onSaved(saved);
  });
}
