/**
 * Writing rows back out as CSV — the counterpart of `csv-rows.ts`, which only counts them.
 *
 * The import API has no route that edits a saved draft, so a correction is a fresh source: the
 * whole sheet is written out again with the edits applied and checked from the top. See
 * `bulk-import-dialog.store.ts` `applyRowFixes`.
 */

/** Anything that would change how a reader splits the record, plus edge whitespace a trim would eat. */
const NEEDS_QUOTING = /[",\r\n]/;

/** RFC 4180: the cell is quoted when it has to be, and an inner `"` doubles. */
export function toCsvCell(value: string | null | undefined): string {
  const text = value ?? '';
  if (!NEEDS_QUOTING.test(text) && text === text.trim()) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Header row from `columns`, then one record per row, CRLF-separated. Keys outside `columns` are
 * dropped and columns a row does not carry come out empty, so every record has the same width
 * however ragged the draft was.
 */
export function rowsToCsv(
  columns: readonly string[],
  rows: readonly Record<string, string | null>[],
): string {
  const lines = [columns.map(toCsvCell).join(',')];

  for (const row of rows) {
    lines.push(columns.map((column) => toCsvCell(row[column])).join(','));
  }

  return lines.join('\r\n');
}

/**
 * The columns to write when the draft reports none of its own: every key any row carries, in the
 * order they were first seen. The same fallback the Validate table applies to its own headers.
 */
export function unionColumns(rows: readonly Record<string, string | null>[]): string[] {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const column of Object.keys(row)) columns.add(column);
  }

  return [...columns];
}
