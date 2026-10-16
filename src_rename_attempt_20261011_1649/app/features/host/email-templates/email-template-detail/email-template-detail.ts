import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { EmailTemplateRow } from '@shared/interfaces';

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
 * The body previews inside a sandboxed iframe rather than through `[innerHTML]`. These are
 * table-based emails whose whole appearance lives in inline `style` attributes, and Angular's HTML
 * sanitiser strips `style` — the preview would show the text with none of the design. The `sandbox`
 * list grants only `allow-same-origin`, which is what lets the host measure the rendered document
 * to size the frame; scripts, forms and navigation stay denied, and without `allow-scripts` the
 * same-origin grant carries nothing that can act on it.
 */
@Component({
  selector: 'app-email-template-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './email-template-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplateDetail {
  readonly #commonService = inject(Common);

  readonly template = input<EmailTemplateRow | undefined>();
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  /** So the template can render an absent value as a placeholder rather than as content. */
  protected readonly emptyValue = EMPTY;

  /** Empty markup means there is nothing to preview, so the panel says so instead. */
  protected readonly hasBody = computed(() => (this.template()?.body ?? '').trim().length !== 0);

  protected readonly preview = viewChild<ElementRef<HTMLIFrameElement>>('bodyPreview');

  /** Watches the previewed document, so the frame keeps fitting it. Re-made on every `load`. */
  #bodyResize?: ResizeObserver;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#bodyResize?.disconnect());

    // Written as a property rather than bound in the template: Angular sanitises a `srcdoc`
    // binding as HTML, which is the stripping this iframe exists to avoid.
    effect(() => {
      const frame = this.preview()?.nativeElement;
      if (frame) {
        frame.srcdoc = this.template()?.body ?? '';
      }
    });
  }

  protected readonly sections = computed<DetailSection[]>(() => {
    const template = this.template();
    if (!template) {
      return [];
    }

    return [
      {
        title: 'Identity',
        items: [
          { label: 'Code', value: text(template.templateCode), fullWidth: true },
          { label: 'Category', value: text(template.category) },
          { label: 'Language', value: text(template.languageCode) },
        ],
      },
      {
        title: 'Sender and recipients',
        items: [
          { label: 'From Email', value: text(template.fromEmail) },
          { label: 'From Name', value: text(template.fromName) },
          { label: 'CC', value: text(template.ccEmail), fullWidth: true },
          { label: 'BCC', value: text(template.bccEmail), fullWidth: true },
        ],
      },
      {
        title: 'Record',
        items: [
          { label: 'Added', value: this.#dateText(template.addedDateTime) },
          { label: 'Last Updated', value: this.#dateText(template.updatedDateTime) },
        ],
      },
    ];
  });

  /**
   * Grows the frame to the height of the email it just rendered, so a short body does not sit in a
   * scroller of its own inside the panel's scroller. The template's `max-h` caps a long one, which
   * then scrolls internally as before.
   */
  protected fitToContent(frame: HTMLIFrameElement) {
    const doc = frame.contentDocument;
    const body = doc?.body;
    if (!doc || !body) {
      return;
    }

    const apply = () => {
      // The body's own margins sit outside `scrollHeight`, and these emails keep the default 8px.
      // Measuring without them left the frame a few pixels short, which is a scrollbar all the same.
      const style = doc.defaultView?.getComputedStyle(body);
      const margins = style
        ? Number.parseFloat(style.marginTop) + Number.parseFloat(style.marginBottom)
        : 0;
      const height = `${Math.ceil(body.scrollHeight + margins)}px`;
      if (frame.style.height !== height) {
        frame.style.height = height;
      }
    };

    apply();

    // A logo or web font that settles after `load` changes the height again; without this the frame
    // keeps the height it was first measured at and scrolls internally after all.
    this.#bodyResize?.disconnect();
    this.#bodyResize = new ResizeObserver(apply);
    this.#bodyResize.observe(body);
  }

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
