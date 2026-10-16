import { describe, expect, it } from 'vitest';

import { countCsvDataRows } from './csv-rows';
import { rowsToCsv, toCsvCell, unionColumns } from './csv-serialise';

describe('toCsvCell', () => {
  it('leaves a plain value alone', () => {
    expect(toCsvCell('Engineering')).toBe('Engineering');
  });

  it('writes a missing value as an empty cell', () => {
    expect(toCsvCell(null)).toBe('');
    expect(toCsvCell(undefined)).toBe('');
  });

  it('quotes a value carrying the delimiter', () => {
    expect(toCsvCell('101, MG Road')).toBe('"101, MG Road"');
  });

  it('doubles an inner quote', () => {
    expect(toCsvCell('the "main" office')).toBe('"the ""main"" office"');
  });

  it('quotes a value carrying a newline', () => {
    expect(toCsvCell('first\nsecond')).toBe('"first\nsecond"');
  });

  it('quotes edge whitespace, which a reader would otherwise trim away', () => {
    expect(toCsvCell(' EMP001 ')).toBe('" EMP001 "');
  });
});

describe('rowsToCsv', () => {
  const columns = ['Code', 'Name', 'IsActive'];

  it('writes the header, then one record per row, CRLF-separated', () => {
    const csv = rowsToCsv(columns, [
      { Code: 'E1', Name: 'Asha', IsActive: 'true' },
      { Code: 'E2', Name: 'Rahul', IsActive: 'false' },
    ]);

    expect(csv).toBe('Code,Name,IsActive\r\nE1,Asha,true\r\nE2,Rahul,false');
  });

  it('follows the column order it is given, not the key order of the row', () => {
    const csv = rowsToCsv(columns, [{ IsActive: 'true', Name: 'Asha', Code: 'E1' }]);

    expect(csv.split('\r\n')[1]).toBe('E1,Asha,true');
  });

  it('drops keys the column list does not name', () => {
    const csv = rowsToCsv(columns, [{ Code: 'E1', Name: 'Asha', IsActive: 'true', Extra: 'x' }]);

    expect(csv).not.toContain('x');
  });

  it('writes a column the row does not carry as an empty cell', () => {
    const csv = rowsToCsv(columns, [{ Code: 'E1' }]);

    expect(csv.split('\r\n')[1]).toBe('E1,,');
  });

  it('round-trips through the row counter the store pre-checks with', () => {
    const csv = rowsToCsv(columns, [
      { Code: 'E1', Name: 'first\nsecond', IsActive: 'true' },
      { Code: 'E2', Name: 'Rahul, Sharma', IsActive: 'false' },
      { Code: 'E3', Name: 'the "main" one', IsActive: 'true' },
    ]);

    expect(countCsvDataRows(csv)).toBe(3);
  });
});

describe('unionColumns', () => {
  it('collects every key any row carries, in the order first seen', () => {
    expect(
      unionColumns([
        { b: '1', a: '2' },
        { c: '3', a: '4' },
      ]),
    ).toEqual(['b', 'a', 'c']);
  });
});
