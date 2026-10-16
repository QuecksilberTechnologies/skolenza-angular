import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { DefaultEmailConfigRow } from '@shared/interfaces';

interface DetailItem {
  label: string;
  value: string;
  /** Spans both grid columns. For values the 480px panel cannot fit in half its width. */
  fullWidth?: boolean;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

/** The sanctioned empty-value placeholder. Named so the template can paint it as a placeholder. */
const EMPTY = '—';

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? EMPTY : `${value}`;

/**
 * Read-only summary for the row detail sheet.
 *
 * The SMTP password is never shown, and never fetched: the reads do not return it.
 */
@Component({
  selector: 'app-default-email-config-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './default-email-config-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefaultEmailConfigDetail {
  readonly #commonService = inject(Common);

  readonly config = input<DefaultEmailConfigRow | undefined>();
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  /** So the template can render an absent value as a placeholder rather than as content. */
  protected readonly emptyValue = EMPTY;

  protected readonly sections = computed<DetailSection[]>(() => {
    const config = this.config();
    if (!config) {
      return [];
    }

    return [
      {
        title: 'SMTP account',
        items: [
          { label: 'Host', value: text(config.smtpHost) },
          { label: 'Port', value: text(config.smtpPort) },
          { label: 'Username', value: text(config.smtpUsername), fullWidth: true },
          // Write-only on the API, so there is nothing to reveal or mask here.
          { label: 'Password', value: 'Stored on the server, never shown', fullWidth: true },
        ],
      },
      {
        title: 'Sender',
        items: [
          { label: 'From Email', value: text(config.fromEmail) },
          { label: 'From Name', value: text(config.fromName) },
        ],
      },
      {
        title: 'Record',
        items: [
          { label: 'Added', value: this.#dateText(config.addedDateTime) },
          { label: 'Last Updated', value: this.#dateText(config.updatedDateTime) },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onEdit() {
    this.edit.emit();
  }

  #dateText(value: string | null | undefined): string {
    return value ? text(this.#commonService.getFormattedDate(value, 'dd MMM yyyy, HH:mm')) : EMPTY;
  }
}
