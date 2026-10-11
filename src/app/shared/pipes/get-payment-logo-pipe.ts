import { Pipe, PipeTransform } from '@angular/core';
import icons from 'payments-icons-library';

@Pipe({
  name: 'getPaymentLogo',
})
export class GetPaymentLogoPipe implements PipeTransform {
  /** Logo URL for a bank or payment method name (e.g. `HDFC Bank`, `UPI`), or `null` when the library has no match. */
  transform(name: string | null | undefined): string | null {
    if (!name?.trim()) return null;
    // 64px PNG, not 'svg': the library's SVGs wrap 512-2048px bitmaps that blur when shrunk to 20px.
    const icon = icons.getIcon(name, 'md');
    return icon.icon_name === 'default' ? null : icon.icon_url;
  }
}
