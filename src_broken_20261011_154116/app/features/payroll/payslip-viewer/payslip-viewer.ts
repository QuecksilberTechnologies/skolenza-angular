import { CurrencyPipe, DatePipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DividerModule } from '@openng/optimus-ui/divider';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TagModule } from '@openng/optimus-ui/tag';

import { AuthStore } from '@core/stores';
import { Payslip } from '@shared/interfaces';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Component({
  selector: 'app-payslip-viewer',
  imports: [CurrencyPipe, DatePipe, NgOptimizedImage, ButtonModule, DividerModule, TagModule],
  templateUrl: './payslip-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayslipViewer implements OnInit {
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #authStore = inject(AuthStore);
  readonly payslip = signal<Payslip | null>(null);
  readonly companyName = this.#authStore.institutionName;
  readonly isDownloading = signal(false);
  readonly pdfTemplate = viewChild<ElementRef<HTMLElement>>('pdfTemplate');

  ngOnInit(): void {
    const data = this.#dialogConfig.data?.payslip as Payslip | undefined;
    if (data) {
      this.payslip.set(data);
    }
  }

  getMonthName(month: number): string {
    return MONTH_NAMES[month - 1] ?? '';
  }

  close(): void {
    this.#dialogRef.close();
  }

  async downloadPayslip(): Promise<void> {
    const slip = this.payslip();
    const el = this.pdfTemplate()?.nativeElement;
    if (!slip || !el) return;

    this.isDownloading.set(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = margin;
      doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        doc.addPage();
        doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      doc.save(`payslip-${slip.staffMemberId}-${slip.month}-${slip.year}.pdf`);
    } finally {
      this.isDownloading.set(false);
    }
  }
}
