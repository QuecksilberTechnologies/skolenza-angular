import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { Certificate } from '@shared/interfaces';

import { CertificateStore } from '../store/certificate.store';
import { LdCertificateCard } from '../ui/ld-certificate-card';

@Component({
  selector: 'app-ld-certificates',
  imports: [LdCertificateCard, TableLoader, TableEmptyMessage],
  providers: [CertificateStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (!store.certificates().length) {
      <app-table-empty-message
        icon="pi pi-verified"
        message="No certificates yet"
        subMessage="Complete a course to earn your first certificate."
      />
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (cert of store.certificates(); track cert.id) {
          <app-ld-certificate-card
            [certificate]="cert"
            (download)="onDownload($event)"
            (share)="onShare($event)"
          />
        }
      </div>
    }
  `,
})
export default class LdCertificates {
  protected readonly store = inject(CertificateStore);
  readonly #common = inject(Common);

  protected onDownload(cert: Certificate): void {
    this.#common.showMessage(`Preparing ${cert.certificateNumber}.pdf…`, 'info');
  }

  protected onShare(cert: Certificate): void {
    this.#common.showMessage(`Share link copied for "${cert.courseTitle}".`, 'success');
  }
}
