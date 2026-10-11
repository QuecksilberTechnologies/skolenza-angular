import { countCsvDataRows, countCsvRecords } from './csv-rows';

describe('countCsvRecords', () => {
  it('counts one record per line', () => {
    expect(countCsvRecords('RoleName,RoleType\nAdmin,1\nManager,3')).toBe(3);
  });

  it('ignores blank lines and a trailing newline', () => {
    expect(countCsvRecords('RoleName,RoleType\n\nAdmin,1\n')).toBe(2);
  });

  it('reads a newline inside a quoted cell as part of its record', () => {
    expect(countCsvRecords('RoleName,Remark\nAdmin,"first line\nsecond line"')).toBe(2);
  });

  it('keeps a doubled quote inside the cell rather than closing it', () => {
    expect(countCsvRecords('RoleName,Remark\nAdmin,"say ""hi""\nagain"')).toBe(2);
  });

  it('ignores a carriage return, so CRLF counts the same as LF', () => {
    expect(countCsvRecords('RoleName,RoleType\r\nAdmin,1\r\n')).toBe(2);
  });

  it('counts nothing in empty or whitespace-only text', () => {
    expect(countCsvRecords('')).toBe(0);
    expect(countCsvRecords('\n \n')).toBe(0);
  });
});

describe('countCsvDataRows', () => {
  it('discounts the header row', () => {
    expect(countCsvDataRows('RoleName,RoleType\nAdmin,1\nManager,3')).toBe(2);
  });

  it('answers 0 for a header on its own, never a negative count', () => {
    expect(countCsvDataRows('RoleName,RoleType')).toBe(0);
    expect(countCsvDataRows('')).toBe(0);
  });

  it('counts a quoted multi-line remark as the one row it is', () => {
    expect(countCsvDataRows('RoleName,Remark\nAdmin,"first line\nsecond line"')).toBe(1);
  });
});
