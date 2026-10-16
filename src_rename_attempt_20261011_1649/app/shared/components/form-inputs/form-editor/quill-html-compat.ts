/**
 * Font stacks the editor's font control sets, shared so a Quill class maps onto the same value.
 *
 * Deliberately free of multi-word family names: CSSOM re-quotes those when this file writes the
 * style, the extension writes them unquoted when the toolbar does, and the two spellings would
 * stop matching - leaving the font control blank over text it had just styled.
 */
export const SERIF_FONT = 'Georgia, serif';
export const MONOSPACE_FONT = 'Menlo, Consolas, monospace';

/**
 * Quill's default whitelist: the sans-serif entry carries no class, so it needs no
 * mapping — stripping the others already leaves the inherited font behind.
 */
const FONT_BY_CLASS: Record<string, string> = {
  'ql-font-serif': SERIF_FONT,
  'ql-font-monospace': MONOSPACE_FONT,
};

/** A `ql-`-prefixed class inside a `class` attribute, not the two letters anywhere in the text. */
const QUILL_CLASS = /class\s*=\s*["'][^"']*\bql-/i;

/** Left is Quill's default and carries no class. */
const ALIGN_BY_CLASS: Record<string, string> = {
  'ql-align-center': 'center',
  'ql-align-right': 'right',
  'ql-align-justify': 'justify',
};

/**
 * Rewrites the `ql-*` classes an older Quill body carries into the inline styles the
 * current editor reads.
 *
 * Quill expressed font, alignment, indent and its code block as *classes* backed by its
 * own stylesheet; ProseMirror parses `style` only. Left alone, every template saved
 * before the swap would open with its fonts and alignment gone — and silently, because
 * the first keystroke writes the flattened markup straight back. Colour and background
 * need no help: Quill already emitted those inline.
 *
 * `ql-indent-*` and `ql-syntax` are dropped rather than mapped. Indent has no format to
 * land on, and `ql-syntax` was only ever a hook for Quill's own `<pre>` styling.
 *
 * Pure and DOM-only: no sanitising happens here, same as everywhere else in this
 * component - see `form-editor.ts`.
 */
export function normalizeQuillHtml(html: string): string {
  // Reserialising rewrites markup the user never asked us to touch, so leave a body that
  // carries nothing of Quill's exactly as it was stored. The test is deliberately narrow: a
  // plain `includes('ql-')` would also fire on body *text* that happens to mention it, and on
  // an unrelated class like `sql-block`. Also the SSR guard: `DOMParser` is browser-only.
  if (!QUILL_CLASS.test(html) || typeof DOMParser === 'undefined') {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const element of doc.body.querySelectorAll<HTMLElement>('[class]')) {
    let changed = false;

    for (const name of [...element.classList]) {
      if (!name.startsWith('ql-')) {
        continue;
      }

      const font = FONT_BY_CLASS[name];
      const align = ALIGN_BY_CLASS[name];
      if (font) {
        element.style.fontFamily = font;
      } else if (align) {
        element.style.textAlign = align;
      }

      element.classList.remove(name);
      changed = true;
    }

    if (changed && element.classList.length === 0) {
      element.removeAttribute('class');
    }
  }

  return doc.body.innerHTML;
}
