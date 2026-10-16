import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Field } from '@angular/forms/signals';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { type Popover, PopoverModule } from '@openng/optimus-ui/popover';
import { SelectModule } from '@openng/optimus-ui/select';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import type { ChainedCommands, Editor } from '@tiptap/core';

import { ColorPicker } from '../../color-picker/color-picker';
import { FormFieldShell } from '../form-field-shell/form-field-shell';
import { MONOSPACE_FONT, normalizeQuillHtml, SERIF_FONT } from './quill-html-compat';

/**
 * Anything else - `javascript:` above all - has no business in an email body. `{{` is here
 * because a template's whole point is placeholders: `{{ResetLink}}` is the address of half the
 * links this editor will ever write, and Quill accepted it.
 */
const SAFE_URL = /^(?:https?:\/\/|mailto:|tel:|\{\{)/i;

type PromptMode = 'link' | 'image';

/**
 * Rich-text field (Tiptap/ProseMirror), toolbar and all.
 *
 * **The field holds an HTML string.** Tiptap only emits the nodes and marks its
 * extension set registers, and Angular's `DomSanitizer` sanitises again at whatever
 * renders it, so no sanitising layer belongs here. Length or content rules go in the
 * form's zod schema like every other rule.
 *
 * **An emptied editor is not an empty string.** ProseMirror keeps its root paragraph,
 * so clearing every character stores `'<p></p>'` — markup that is truthy and eight
 * characters long. A `z.string().min(1)` rule would pass on a visibly empty field;
 * a required rich-text field has to test the *text*, e.g.
 * `.refine((html) => html.replace(/<[^>]*>/g, '').trim().length > 0, '…')`.
 *
 * **The content area is deliberately light in both themes.** An email body is
 * authored for a mail client, and a mail client is a white page - the markup's own
 * inline styles say `color: #333` and assume that ground. Rendered on a dark
 * canvas, the text goes dark-on-dark and the body's pale fills read as boxes. The
 * toolbar stays on the app theme; only the page inside is pinned. See
 * `form-editor.css`.
 *
 * **There is no table control** - the formats are heading, font, bold, italic,
 * underline, colour, background, list, align, link, image, code block and clear.
 * Markup the editor has no node for, a layout `<table>` above all, has nothing to map
 * onto and does not survive a round trip. A caller whose content may contain one needs
 * an HTML-source path of its own; see
 * `features/host/email-templates/email-template-form`.
 *
 * **Bodies saved by the previous Quill editor pass through `normalizeQuillHtml` first**,
 * which rewrites its `ql-*` classes into the inline styles ProseMirror parses. See
 * `quill-html-compat.ts`.
 *
 * Tiptap is not an Angular component and has no `ControlValueAccessor`, so the field is
 * written directly on `onUpdate` — the same shape `app-form-color` uses for its hex
 * input, and the reason there is no `$any(...)` cast here.
 */
@Component({
  selector: 'app-form-editor',
  imports: [
    FormsModule,
    InputTextModule,
    PopoverModule,
    SelectModule,
    TooltipModule,
    ColorPicker,
    FormFieldShell,
  ],
  templateUrl: './form-editor.html',
  styleUrl: './form-editor.css',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormEditor {
  readonly field = input.required<Field<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly minHeight = input('10rem');
  /**
   * Browser spell-check on ProseMirror's contenteditable. Worth turning off for content built
   * from placeholders - `{{UserName}}` and friends draw a red underline under every one of
   * them, which makes a correct template read as full of errors.
   */
  readonly spellcheck = input(true, { transform: booleanAttribute });

  protected readonly headings = [
    { label: 'Normal', value: 0 },
    { label: 'Heading 1', value: 1 },
    { label: 'Heading 2', value: 2 },
    { label: 'Heading 3', value: 3 },
  ];

  protected readonly fonts = [
    { label: 'Sans Serif', value: '' },
    { label: 'Serif', value: SERIF_FONT },
    { label: 'Monospace', value: MONOSPACE_FONT },
  ];

  protected readonly alignments = [
    { value: 'left', icon: 'pi-align-left', label: 'Align left' },
    { value: 'center', icon: 'pi-align-center', label: 'Align center' },
    { value: 'right', icon: 'pi-align-right', label: 'Align right' },
    { value: 'justify', icon: 'pi-align-justify', label: 'Justify' },
  ];

  /** One popover serves every prompt the toolbar raises, so it carries a mode. */
  protected readonly promptMode = signal<PromptMode>('link');
  protected readonly href = signal('');
  /** Whether the link prompt was opened over a selection, or inside an existing link. */
  protected readonly linkHasTarget = signal(false);
  protected readonly imageSrc = signal('');
  protected readonly imageAlt = signal('');

  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');

  #editor: Editor | null = null;
  /**
   * The last HTML this component pushed into the field. The sync effect compares against it
   * so a keystroke does not bounce straight back through `setContent`, which would reset the
   * selection on every character.
   */
  #lastEmitted: string | null = null;
  /** The range the toolbar was reached for; see {@link onToolbarMouseDown}. */
  #savedSelection: { from: number; to: number } | null = null;

  /**
   * Bumped on every ProseMirror transaction — document *and* selection — so the toolbar's
   * active states recompute. Zoneless change detection is driven by signal notification and
   * Tiptap's callbacks fire outside Angular, so this is what makes them visible.
   */
  readonly #revision = signal(0);
  /** Flips once the lazy chunk has landed and the editor exists; re-runs the effects below. */
  readonly #ready = signal(false);

  constructor() {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      this.#editor?.destroy();
      this.#editor = null;
    });

    // ProseMirror needs a real element and never runs on the server, which is exactly what
    // `afterNextRender` guarantees. The chunk is pulled in lazily, the way `payslip-viewer`
    // pulls in its PDF stack.
    afterNextRender(async () => {
      const [
        { Editor },
        { StarterKit },
        { TextStyleKit },
        { TextAlign },
        { Image },
        { Placeholder },
      ] = await Promise.all([
        import('@tiptap/core'),
        import('@tiptap/starter-kit'),
        import('@tiptap/extension-text-style'),
        import('@tiptap/extension-text-align'),
        import('@tiptap/extension-image'),
        import('@tiptap/extensions'),
      ]);

      if (destroyed) {
        return;
      }

      const state = this.field()();
      const initial = state.value();
      this.#lastEmitted = initial;

      this.#editor = new Editor({
        element: this.editorHost().nativeElement,
        content: normalizeQuillHtml(initial),
        editable: !state.disabled(),
        extensions: [
          StarterKit.configure({
            // Following a link while editing is not what a click in a text box means, and
            // autolinking rewrites a placeholder the moment it looks like a host name.
            link: { openOnClick: false, autolink: false, HTMLAttributes: { rel: 'noopener' } },
          }),
          TextStyleKit.configure({ fontSize: false, lineHeight: false }),
          TextAlign.configure({ types: ['heading', 'paragraph'] }),
          // Corner handles only, ratio locked: the resize writes plain `width`/`height`
          // attributes on the `<img>`, which is the sizing a mail client actually honours -
          // a CSS width would be stripped or ignored by half of them.
          Image.configure({
            // An embedded logo is ordinary in an email body, and refusing `data:` here does not
            // reject it - it drops it silently on parse and writes the stripped markup back.
            allowBase64: true,
            // A block image is its own node, so the align buttons - which write `textAlign` on
            // `heading` and `paragraph` - have nothing to write to, and the resize node view
            // wraps it in a `display: flex` container that pins it left whatever a parent's
            // `text-align` says. Inline, the image lives inside its paragraph: the same buttons
            // align it, and it serialises as `<p style="text-align: center"><img ...></p>`,
            // which is the one centring idiom mail clients agree on. It is also what the old
            // Quill bodies already carry, so `ql-align-center` around a logo survives the trip.
            inline: true,
            resize: {
              enabled: true,
              directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
              minWidth: 40,
              minHeight: 40,
              alwaysPreserveAspectRatio: true,
            },
          }),
          Placeholder.configure({ placeholder: this.placeholder() ?? '' }),
        ],
        editorProps: {
          // The focusable control is ProseMirror's own contenteditable, which it creates
          // itself; ARIA on the host element would not reach it and the textbox would have
          // no accessible name.
          attributes: {
            id: this.inputId(),
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-labelledby': `${this.inputId()}-label`,
            'aria-describedby': `${this.inputId()}-help`,
            spellcheck: String(this.spellcheck()),
          },
        },
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          this.#lastEmitted = html;
          const field = this.field()();
          field.value.set(html);
          field.markAsDirty();
        },
        onBlur: () => this.field()().markAsTouched(),
        onTransaction: () => this.#revision.update((revision) => revision + 1),
      });

      this.#ready.set(true);
      // Construction dispatches no transaction, so the toolbar's computed state would keep the
      // values it read while the editor was still null - a body opening on an `<h2>` would
      // report "Normal" until the first click.
      this.#revision.update((revision) => revision + 1);
    });

    // The value can change from outside — the email-template form edits the same field
    // through an HTML-source textarea, then switches back. `emitUpdate: false` stops the
    // write from echoing straight back out through `onUpdate`.
    effect(() => {
      const value = this.field()().value();
      if (!this.#ready() || value === this.#lastEmitted) {
        return;
      }

      this.#lastEmitted = value;
      this.#editor?.commands.setContent(normalizeQuillHtml(value), { emitUpdate: false });
    });

    effect(() => {
      const disabled = this.field()().disabled();
      if (this.#ready()) {
        // `emitUpdate` defaults to true, and this effect re-runs the moment the editor is ready.
        // Left on, merely opening a template fires `onUpdate`, which writes ProseMirror's own
        // re-serialisation over the stored body and marks the pristine form dirty - enough to
        // raise the unsaved-changes prompt on the way out.
        this.#editor?.setEditable(!disabled, false);
      }
    });
  }

  protected readonly disabled = computed(() => this.field()().disabled());

  protected readonly headingLevel = computed(() => {
    this.#revision();
    return [1, 2, 3].find((level) => this.#editor?.isActive('heading', { level })) ?? 0;
  });

  protected readonly fontFamily = computed(() => {
    this.#revision();
    return (this.#editor?.getAttributes('textStyle')['fontFamily'] as string | undefined) ?? '';
  });

  protected readonly textColor = computed(() => {
    this.#revision();
    return (this.#editor?.getAttributes('textStyle')['color'] as string | undefined) ?? '#000000';
  });

  protected readonly backgroundColor = computed(() => {
    this.#revision();
    return (
      (this.#editor?.getAttributes('textStyle')['backgroundColor'] as string | undefined) ??
      '#ffffff'
    );
  });

  /**
   * Gates the prompt's own button rather than rejecting on press: a click that silently does
   * nothing reads as a broken editor.
   *
   * A link also needs text to sit on. On a bare caret `extendMarkRange` has no mark to widen
   * and `setLink` only stores a pending mark, so Apply would close the popover having done
   * nothing visible - unless the caret is already inside a link, where the range is real.
   */
  protected readonly canApplyLink = computed(
    () => this.linkHasTarget() && SAFE_URL.test(this.href().trim()),
  );
  protected readonly canInsertImage = computed(() => SAFE_URL.test(this.imageSrc().trim()));

  protected isActive(name: string, attributes?: Record<string, unknown>): boolean {
    this.#revision();
    return this.#editor?.isActive(name, attributes) ?? false;
  }

  /** Alignment is a node attribute, not a named mark, so it asks by attribute. */
  protected isAligned(align: string): boolean {
    this.#revision();
    return this.#editor?.isActive({ textAlign: align }) ?? false;
  }

  /**
   * Pressing anything in the toolbar would otherwise blur the editor, and ProseMirror reads the
   * collapsed DOM selection a blur leaves behind straight back into its own state. `focus()`
   * then restores a caret rather than the range the user had picked, so every mark command -
   * font, colour - would land on nothing. Cancelling the mousedown keeps the selection alive;
   * the snapshot covers the paths that still lose focus, the colour panel above all, which owns
   * inputs of its own and cannot have its own mousedown cancelled.
   */
  protected onToolbarMouseDown(event: MouseEvent): void {
    this.#saveSelection();
    event.preventDefault();
  }

  protected toggleBold(): void {
    this.#run((chain) => chain.toggleBold());
  }

  protected toggleItalic(): void {
    this.#run((chain) => chain.toggleItalic());
  }

  protected toggleUnderline(): void {
    this.#run((chain) => chain.toggleUnderline());
  }

  protected toggleOrderedList(): void {
    this.#run((chain) => chain.toggleOrderedList());
  }

  protected toggleBulletList(): void {
    this.#run((chain) => chain.toggleBulletList());
  }

  protected toggleCodeBlock(): void {
    this.#run((chain) => chain.toggleCodeBlock());
  }

  protected setHeading(level: number): void {
    this.#run((chain) =>
      level === 0 ? chain.setParagraph() : chain.toggleHeading({ level: level as 1 | 2 | 3 }),
    );
  }

  protected setFont(font: string): void {
    this.#run((chain) => (font ? chain.setFontFamily(font) : chain.unsetFontFamily()));
  }

  protected setAlign(align: string): void {
    this.#run((chain) => chain.setTextAlign(align));
  }

  protected setColor(color: string): void {
    this.#run((chain) => chain.setColor(color));
  }

  protected clearColor(): void {
    this.#run((chain) => chain.unsetColor());
  }

  protected setBackgroundColor(color: string): void {
    this.#run((chain) => chain.setBackgroundColor(color));
  }

  protected clearBackgroundColor(): void {
    this.#run((chain) => chain.unsetBackgroundColor());
  }

  /** Quill's "clean": strip the marks, then flatten the block back to a paragraph. */
  protected clearFormatting(): void {
    this.#run((chain) => chain.unsetAllMarks().clearNodes());
  }

  protected openPrompt(mode: PromptMode, event: Event, popover: Popover): void {
    this.promptMode.set(mode);
    if (mode === 'link') {
      const editor = this.#editor;
      this.href.set((editor?.getAttributes('link')['href'] as string | undefined) ?? '');
      this.linkHasTarget.set(
        editor
          ? editor.state.selection.from !== editor.state.selection.to || editor.isActive('link')
          : false,
      );
    } else {
      this.imageSrc.set('');
      this.imageAlt.set('');
    }

    popover.toggle(event);
  }

  protected applyLink(popover: Popover): void {
    const href = this.href().trim();
    if (!SAFE_URL.test(href)) {
      return;
    }

    this.#run((chain) => chain.extendMarkRange('link').setLink({ href }));
    popover.hide();
  }

  protected removeLink(popover: Popover): void {
    this.#run((chain) => chain.extendMarkRange('link').unsetLink());
    popover.hide();
  }

  protected applyImage(popover: Popover): void {
    const src = this.imageSrc().trim();
    if (!SAFE_URL.test(src)) {
      return;
    }

    this.#run((chain) => chain.setImage({ src, alt: this.imageAlt().trim() }));
    popover.hide();
  }

  /** Taken while the editor still has focus, so the range survives an overlay opening. */
  #saveSelection(): void {
    const selection = this.#editor?.state.selection;
    this.#savedSelection = selection ? { from: selection.from, to: selection.to } : null;
  }

  /**
   * Every command refocuses and puts the saved range back first, so it acts on the text the
   * user had selected when they reached for the toolbar - not on the caret a blur left behind.
   */
  #run(command: (chain: ChainedCommands) => ChainedCommands): void {
    const editor = this.#editor;
    if (!editor) {
      return;
    }

    const chain = editor.chain().focus();
    const saved = this.#savedSelection;
    command(saved ? chain.setTextSelection(saved) : chain).run();
    this.#savedSelection = null;
  }
}
