import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

@Component({
  selector: 'app-version-update-dialog',
  imports: [ButtonModule],
  templateUrl: './version-update-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class VersionUpdateDialog {
  #ref = inject(DynamicDialogRef);

  closeDialog() {
    this.#ref.close();
  }
}
