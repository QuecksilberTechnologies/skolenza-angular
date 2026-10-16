import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { TagModule } from '@openng/optimus-ui/tag';
import { QRCodeComponent } from 'angularx-qrcode';

import { Asset } from '@shared/interfaces';

@Component({
  selector: 'app-asset-detail',
  imports: [TagModule, ButtonModule, CurrencyPipe, DatePipe, QRCodeComponent, DialogModule],
  templateUrl: './asset-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetail {
  readonly asset = input<Asset | undefined>();
  readonly closePopup = output();
  protected qrCodeDownloadLink: SafeUrl = '';
  protected readonly qrDialogVisible = signal(false);

  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }

  openQrDialog() {
    this.qrDialogVisible.set(true);
  }

  onCancel() {
    this.closePopup.emit();
  }
}
