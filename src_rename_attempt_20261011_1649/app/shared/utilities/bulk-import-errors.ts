/**
 * Matching a bulk-import row error back to the cell it is about.
 *
 * The API writes one sentence per broken rule, each opening with the column it judges
 * ("DepartmentId must be active in this institution."), and carries no field metadata of its own. The
 * name the sentence *starts* with is therefore the only dependable link back — a column named
 * further in is the rule's reference, not its subject, and marking it would point at the wrong
 * cell.
 *
 * Lives here rather than on the dialog because two surfaces need it: the Validate table marks the
 * offending cells, and the fix editor puts each sentence under the field it belongs to.
 */

/** Strips the API's own opening quote, which is not part of the name it is quoting. */
const LEADING_QUOTE = /^["'`‘“]/;

/**
 * Every name an error may call a source column by, longest first so `ContactCountryId` is not read
 * as `CountryId` sharing its tail.
 *
 * `columnMapping` is read from both sides: which way round it is keyed is the API's business, and
 * either way the half that appears in `columns` is the cell to mark.
 */
export function columnAliases(
  columns: readonly string[],
  columnMapping: Record<string, string> = {},
): [alias: string, column: string][] {
  const bySource = new Set(columns);
  const aliases = new Map(columns.map((column) => [column.toLowerCase(), column]));

  for (const [key, value] of Object.entries(columnMapping)) {
    if (bySource.has(value)) aliases.set(key.toLowerCase(), value);
    else if (bySource.has(key)) aliases.set(value.toLowerCase(), key);
  }

  return [...aliases].sort(([a], [b]) => b.length - a.length);
}

/**
 * The column one sentence is about, or `undefined` when it names none.
 *
 * Matched as a whole name rather than a first word, so a header carrying a space ("StaffMember Name")
 * is found too.
 */
function columnFor(error: string, aliases: readonly [string, string][]): string | undefined {
  const sentence = error.trim().replace(LEADING_QUOTE, '').toLowerCase();

  return aliases.find(
    ([alias]) => sentence.startsWith(alias) && !/[a-z0-9]/.test(sentence[alias.length] ?? ''),
  )?.[1];
}

/** The columns a row's errors are about. Sentences naming no column are dropped. */
export function erroringColumns(
  errors: readonly string[],
  columns: readonly string[],
  columnMapping: Record<string, string> = {},
): Set<string> {
  const aliases = columnAliases(columns, columnMapping);
  const named = errors.map((error) => columnFor(error, aliases));

  return new Set(named.filter((column): column is string => !!column));
}

/**
 * The same pass, keeping the sentence rather than discarding it. `unmatched` holds the ones naming
 * no column — the fix editor shows those against the row, so nothing is silently lost.
 */
export function errorsByColumn(
  errors: readonly string[],
  columns: readonly string[],
  columnMapping: Record<string, string> = {},
): { byColumn: Map<string, string[]>; unmatched: string[] } {
  const aliases = columnAliases(columns, columnMapping);
  const byColumn = new Map<string, string[]>();
  const unmatched: string[] = [];

  for (const error of errors) {
    const column = columnFor(error, aliases);
    if (!column) {
      unmatched.push(error);
      continue;
    }

    const existing = byColumn.get(column);
    if (existing) existing.push(error);
    else byColumn.set(column, [error]);
  }

  return { byColumn, unmatched };
}
