import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';

/** Split on either separator, so the pasted list renders as the mail client would list it. */
const addresses = (value: string): string[] =>
  value
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter((address) => address !== '');

/**
 * The composed mail, drawn the way the recipient's client draws it.
 *
 * The body renders inside a sandboxed iframe rather than through `[innerHTML]`: these templates
 * carry their whole appearance in inline `style` attributes, and Angular's HTML sanitiser strips
 * `style`, which would show the text with none of the design. The `sandbox` list grants only
 * `allow-same-origin`, which is what lets the host measure the rendered document to size the
 * frame; scripts, forms and navigation stay denied, and without `allow-scripts` the same-origin
 * grant carries nothing that can act on it.
 *
 * Placeholders are left as written - the values behind `{{UserName}}` belong to the send, not to
 * the template, so substituting invented ones would preview a mail nobody will receive.
 */
@Component({
  selector: 'app-email-template-preview',
  imports: [ButtonModule, DialogModule],
  templateUrl: './email-template-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplatePreview {
  readonly visible = model(false);

  readonly subject = input('');
  readonly body = input('');
  readonly fromName = input('');
  readonly fromEmail = input('');
  readonly ccEmail = input('');
  readonly bccEmail = input('');

  protected readonly preview = viewChild<ElementRef<HTMLIFrameElement>>('bodyPreview');

  /** Blank falls back to the sending SMTP account, which this screen has no name for. */
  protected readonly senderName = computed(() => this.fromName().trim() || 'Your organisation');
  protected readonly senderEmail = computed(() => this.fromEmail().trim());
  protected readonly senderInitial = computed(() => this.senderName().charAt(0).toUpperCase());

  protected readonly ccList = computed(() => addresses(this.ccEmail()));
  protected readonly bccList = computed(() => addresses(this.bccEmail()));

  protected readonly hasBody = computed(() => this.body().trim().length !== 0);

  /** Watches the previewed document, so the frame keeps fitting it. Re-made on every `load`. */
  #bodyResize?: ResizeObserver;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#bodyResize?.disconnect());

    // Written as a property rather than bound in the template: Angular sanitises a `srcdoc`
    // binding as HTML, which is the stripping this iframe exists to avoid.
    effect(() => {
      const frame = this.preview()?.nativeElement;
      if (frame) {
        frame.srcdoc = this.body();
      }
    });

    // A closed dialog takes its frame with it, and reopening on an empty body renders no frame at
    // all - so nothing would `load` to replace the observer, and it would sit on a discarded
    // document until the whole form went away.
    effect(() => {
      if (!this.visible()) {
        this.#bodyResize?.disconnect();
        this.#bodyResize = undefined;
      }
    });
  }

  /**
   * Grows the frame to the height of the mail it just rendered, so the wrapper owns the one
   * scrollbar rather than the preview scrolling inside a scroller of its own.
   *
   * The observer stays on afterwards because these emails carry images: the logo lands after
   * `load` and adds height the first measurement could not see.
   *
   * Every way this can fail leaves the frame at its authored height, which still scrolls - the
   * mail stays readable, it just keeps a scrollbar of its own.
   */
  protected fitToContent(frame: HTMLIFrameElement): void {
    const doc = frame.contentDocument;
    const body = doc?.body;
    if (!doc || !body) {
      return;
    }

    const apply = () => {
      // The body's own margins sit outside `scrollHeight`, and these emails keep the default 8px.
      // A UA that reports them in anything but pixels parses to `NaN`, which would compose a
      // height string the browser discards - fall back to measuring without them.
      const style = doc.defaultView?.getComputedStyle(body);
      const margins = style
        ? (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0)
        : 0;
      const height = `${Math.ceil(body.scrollHeight + margins)}px`;
      if (frame.style.height !== height) {
        frame.style.height = height;
      }
    };

    apply();
    this.#bodyResize?.disconnect();
    this.#bodyResize = new ResizeObserver(apply);
    this.#bodyResize.observe(body);
  }
}
