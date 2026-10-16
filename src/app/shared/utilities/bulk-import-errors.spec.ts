import { describe, expect, it } from 'vitest';

import { columnAliases, erroringColumns, errorsByColumn } from './bulk-import-errors';

const COLUMNS = [
  'OfficialEmail',
  'CountryId',
  'ContactCountryId',
  'DepartmentId',
  'StaffMember Name',
];

describe('columnAliases', () => {
  it('orders aliases longest first, so a shared tail does not win', () => {
    const [first] = columnAliases(['CountryId', 'ContactCountryId']);

    expect(first[0]).toBe('contactcountryid');
  });

  it('reads the mapping whichever way round it is keyed', () => {
    const fromValue = columnAliases(['DepartmentId'], { Department: 'DepartmentId' });
    const fromKey = columnAliases(['DepartmentId'], { DepartmentId: 'Department' });

    expect(fromValue).toContainEqual(['department', 'DepartmentId']);
    expect(fromKey).toContainEqual(['department', 'DepartmentId']);
  });
});

describe('erroringColumns', () => {
  it('marks the column the sentence opens with', () => {
    const columns = erroringColumns(['DepartmentId must be active.'], COLUMNS);

    expect([...columns]).toEqual(['DepartmentId']);
  });

  it('does not read ContactCountryId as the CountryId sharing its tail', () => {
    const columns = erroringColumns(['ContactCountryId must be active.'], COLUMNS);

    expect([...columns]).toEqual(['ContactCountryId']);
  });

  it('ignores a column merely referenced mid-sentence', () => {
    const columns = erroringColumns(
      ['StaffPositionMasterId must belong to the selected institution.'],
      COLUMNS,
    );

    expect(columns.has('DepartmentId')).toBe(false);
  });

  it('strips the opening quote the API writes around a name', () => {
    const columns = erroringColumns(['"CountryId" must be active.'], COLUMNS);

    expect([...columns]).toEqual(['CountryId']);
  });

  it('matches a header carrying a space as a whole name', () => {
    const columns = erroringColumns(['StaffMember Name is required.'], COLUMNS);

    expect([...columns]).toEqual(['StaffMember Name']);
  });

  it('needs a word boundary after the name, so a longer word does not match', () => {
    const columns = erroringColumns(['CountryIdentifier is unknown.'], COLUMNS);

    expect(columns.size).toBe(0);
  });

  it('finds the column through the mapping when the sentence names the mapped field', () => {
    const columns = erroringColumns(['Department must be active.'], ['DepartmentId'], {
      Department: 'DepartmentId',
    });

    expect([...columns]).toEqual(['DepartmentId']);
  });
});

describe('errorsByColumn', () => {
  it('keys each sentence by the column it opens with', () => {
    const { byColumn } = errorsByColumn(
      ['CountryId must be active.', 'DepartmentId must be active.'],
      COLUMNS,
    );

    expect(byColumn.get('CountryId')).toEqual(['CountryId must be active.']);
    expect(byColumn.get('DepartmentId')).toEqual(['DepartmentId must be active.']);
  });

  it('collects several sentences about one column', () => {
    const { byColumn } = errorsByColumn(
      ['CountryId is required.', 'CountryId must be active.'],
      COLUMNS,
    );

    expect(byColumn.get('CountryId')).toHaveLength(2);
  });

  it('keeps the sentences that name no column, rather than dropping them', () => {
    const { byColumn, unmatched } = errorsByColumn(
      ['The institution has no seats left.', 'CountryId must be active.'],
      COLUMNS,
    );

    expect(unmatched).toEqual(['The institution has no seats left.']);
    expect(byColumn.size).toBe(1);
  });
});
