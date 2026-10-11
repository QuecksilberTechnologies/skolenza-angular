import { describe, expect, it } from 'vitest';

import { MONOSPACE_FONT, normalizeQuillHtml, SERIF_FONT } from './quill-html-compat';

describe('normalizeQuillHtml', () => {
  it('returns markup carrying no Quill class untouched', () => {
    const html = '<p style="text-align: center;">Hello <strong>there</strong></p>';

    expect(normalizeQuillHtml(html)).toBe(html);
  });

  it('leaves a body that only mentions "ql-" in its text or in another class alone', () => {
    const prose = '<p>Set the ql-align-center class by hand</p>';
    const unrelated = '<p class="sql-block">SELECT 1</p>';

    expect(normalizeQuillHtml(prose)).toBe(prose);
    expect(normalizeQuillHtml(unrelated)).toBe(unrelated);
  });

  it('maps the font classes onto inline font stacks', () => {
    expect(normalizeQuillHtml('<p><span class="ql-font-serif">Hi</span></p>')).toContain(
      `font-family: ${SERIF_FONT}`,
    );
    expect(normalizeQuillHtml('<p><span class="ql-font-monospace">Hi</span></p>')).toContain(
      `font-family: ${MONOSPACE_FONT}`,
    );
  });

  it('maps the alignment classes onto text-align', () => {
    expect(normalizeQuillHtml('<p class="ql-align-center">Hi</p>')).toBe(
      '<p style="text-align: center;">Hi</p>',
    );
    expect(normalizeQuillHtml('<h1 class="ql-align-right">Hi</h1>')).toBe(
      '<h1 style="text-align: right;">Hi</h1>',
    );
  });

  it('drops the classes that have no format to land on', () => {
    expect(normalizeQuillHtml('<p class="ql-indent-2">Hi</p>')).toBe('<p>Hi</p>');
    expect(normalizeQuillHtml('<pre class="ql-syntax">code()</pre>')).toBe('<pre>code()</pre>');
  });

  it('keeps classes that are not Quill’s', () => {
    expect(normalizeQuillHtml('<p class="ql-align-right lead">Hi</p>')).toBe(
      '<p class="lead" style="text-align: right;">Hi</p>',
    );
  });

  it('leaves the colours Quill already wrote inline alone', () => {
    const html = '<p class="ql-align-center"><span style="color: rgb(255, 0, 0);">Hi</span></p>';

    expect(normalizeQuillHtml(html)).toBe(
      '<p style="text-align: center;"><span style="color: rgb(255, 0, 0);">Hi</span></p>',
    );
  });
});
