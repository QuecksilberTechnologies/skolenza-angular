import { LdMarkdownPipe } from './ld-markdown.pipe';

describe('LdMarkdownPipe', () => {
  const pipe = new LdMarkdownPipe();

  it('returns empty string for nullish input', () => {
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('renders headings', () => {
    expect(pipe.transform('# Title')).toContain('<h1');
    expect(pipe.transform('## Sub')).toContain('<h2');
    expect(pipe.transform('### Small')).toContain('<h3');
    expect(pipe.transform('# Title')).toContain('Title');
  });

  it('renders bold and inline code', () => {
    expect(pipe.transform('a **b** c')).toContain('<strong>b</strong>');
    expect(pipe.transform('use `npm`')).toContain('<code');
    expect(pipe.transform('use `npm`')).toContain('npm');
  });

  it('groups consecutive list items into a single ul', () => {
    const html = pipe.transform('- one\n- two');
    expect((html.match(/<ul/g) ?? []).length).toBe(1);
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
  });

  it('wraps plain text in paragraphs', () => {
    expect(pipe.transform('hello world')).toContain('<p');
  });

  it('escapes raw angle brackets to prevent injected markup', () => {
    const html = pipe.transform('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
