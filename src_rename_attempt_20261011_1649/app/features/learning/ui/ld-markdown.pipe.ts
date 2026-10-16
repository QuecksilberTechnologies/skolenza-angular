import { Pipe, PipeTransform } from '@angular/core';

/**
 * Minimal markdown → HTML for the knowledge base (headings, bold, inline code,
 * unordered lists, paragraphs). Output is bound via `[innerHTML]`, which Angular
 * sanitizes, so no untrusted markup survives.
 */
@Pipe({ name: 'ldMarkdown' })
export class LdMarkdownPipe implements PipeTransform {
  transform(md: string | null | undefined): string {
    if (!md) return '';
    const escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = escaped.split('\n');
    const html: string[] = [];
    let inList = false;

    const inline = (s: string): string =>
      s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(
          /`(.+?)`/g,
          '<code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">$1</code>',
        );

    const closeList = (): void => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        closeList();
        continue;
      }
      if (line.startsWith('### ')) {
        closeList();
        html.push(`<h3 class="mt-4 mb-1 font-semibold">${inline(line.slice(4))}</h3>`);
      } else if (line.startsWith('## ')) {
        closeList();
        html.push(`<h2 class="mt-5 mb-2 text-lg font-semibold">${inline(line.slice(3))}</h2>`);
      } else if (line.startsWith('# ')) {
        closeList();
        html.push(`<h1 class="mb-3 text-xl font-bold">${inline(line.slice(2))}</h1>`);
      } else if (line.startsWith('- ')) {
        if (!inList) {
          html.push('<ul class="my-2 list-disc pl-5">');
          inList = true;
        }
        html.push(`<li>${inline(line.slice(2))}</li>`);
      } else {
        closeList();
        html.push(`<p class="my-2 leading-relaxed">${inline(line)}</p>`);
      }
    }
    closeList();
    return html.join('');
  }
}
