/**
 * CSV records, not lines: a newline inside a quoted cell continues its record rather than
 * starting one, so a remark written across two lines no longer reads as an extra row — or, on a
 * one-row file, as no rows at all.
 */
export function countCsvRecords(text: string): number {
  let records = 0;
  let record = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (quoted) {
      // A doubled quote is an escaped quote, not the end of the cell.
      if (char === '"' && text[index + 1] === '"') index++;
      else if (char === '"') quoted = false;
      else record += char;
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === '\n') {
      if (record.trim()) records++;
      record = '';
    } else if (char !== '\r') record += char;
  }

  return record.trim() ? records + 1 : records;
}

/** Records after the header, blank lines ignored — the same reading the API applies. */
export function countCsvDataRows(text: string): number {
  return Math.max(countCsvRecords(text) - 1, 0);
}
