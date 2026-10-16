import { A11yModule } from '@angular/cdk/a11y';
import { CdkOverlayOrigin, ConnectedPosition, Overlay, OverlayModule } from '@angular/cdk/overlay';
import { DOCUMENT, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { QRCodeComponent } from 'angularx-qrcode';
import { filter, firstValueFrom, fromEvent } from 'rxjs';

import { Common } from '@core/services/common';
import { InstitutionsApi } from '@core/services/institutions-api';
import { StaffMemberBasicAPI } from '@core/services/staff-member-basic-api';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { SessionUser, IProfileSummary } from '@shared/interfaces';

import { Popup } from '../../popup/popup';

@Component({
  selector: 'app-id-card-popover',
  imports: [UserAvatar, A11yModule, OverlayModule, Popup, ButtonModule, DatePipe, QRCodeComponent],
  templateUrl: './id-card-popover.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdCardPopover {
  readonly #commonService = inject(Common);
  readonly #staffMemberBasicAPI = inject(StaffMemberBasicAPI);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #http = inject(HttpClient);

  readonly origin = input.required<CdkOverlayOrigin>();
  readonly open = model(false);
  readonly closed = output<void>();

  readonly profileSummary = signal<IProfileSummary | null>(null);
  readonly sessionUser = signal<SessionUser | null>(null);
  readonly profileImageDataUrl = signal<string>('');
  readonly institutionLogoDataUrl = signal<string>('');
  readonly isDownloading = signal(false);
  readonly cardRef = viewChild<ElementRef<HTMLElement>>('idCard');
  protected today = new Date();

  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.noop();
  protected readonly panelClass = 'w-[min(42rem,calc(100vw-1.5rem))]';
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  ];

  /** vCard 3.0 payload for the QR code — scanning it adds the staffMember as a contact. */
  readonly vCard = computed(() => {
    const summary = this.profileSummary();
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      summary?.fullName ? `FN:${summary.fullName}` : '',
      this.sessionUser()?.institutionName ? `ORG:${this.sessionUser()?.institutionName}` : '',
      summary?.positionName ? `TITLE:${summary.positionName}` : '',
      summary?.offilcialEmail ? `EMAIL:${summary.offilcialEmail}` : '',
      summary?.mobileNumber ? `TEL:${summary.mobileNumber}` : '',
      summary?.staffMemberCode ? `NOTE:ID ${summary.staffMemberCode}` : '',
      'END:VCARD',
    ];
    return lines.filter(Boolean).join('\r\n');
  });

  constructor() {
    // The app scrolls an inner container, not the window, so CDK's `close` scroll strategy never
    // fires. Listen in the capture phase instead — and ignore scrolling *inside* the card, which
    // has its own overflow container. Same approach as `CdkCloseMenuOnScroll`.
    const view = inject(DOCUMENT).defaultView;
    if (!view) return;

    fromEvent<Event>(view, 'scroll', { capture: true })
      .pipe(
        filter(
          (event) =>
            this.open() &&
            !(event.target instanceof Element && event.target.closest('.cdk-overlay-pane')),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  async loadData(summary: IProfileSummary | null) {
    this.profileSummary.set(summary);
    const loginInfo = await this.#commonService.getLoginInfo();
    this.sessionUser.set(loginInfo?.user ?? null);

    const filePath = this.#staffMemberBasicAPI.profileImage()?.filePath ?? '';
    this.profileImageDataUrl.set(filePath ? await this.#toDataUrl(filePath) : '');

    const logos = this.#institutionsApi.brandLogos();
    const logoUrl = logos.darkLarge ?? logos.lightLarge ?? '';
    this.institutionLogoDataUrl.set(logoUrl ? await this.#toDataUrl(logoUrl) : '');
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }

  /** html2canvas cannot rasterize cross-origin images, so every remote asset is inlined first. */
  async #toDataUrl(url: string): Promise<string> {
    try {
      const blob = await firstValueFrom(this.#http.get(url, { responseType: 'blob' }));
      const reader = new FileReader();
      return await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  async downloadCard() {
    const el = this.cardRef()?.nativeElement;
    if (!el) return;

    this.isDownloading.set(true);
    try {
      const { default: html2canvas } = await import('html2canvas-pro');

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      const name = this.profileSummary()?.fullName?.replace(/\s+/g, '_') ?? 'staffMember';
      link.download = `${name}_ID_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      this.#commonService.showMessage('Failed to download ID card.', 'error');
    } finally {
      this.isDownloading.set(false);
    }
  }
}
