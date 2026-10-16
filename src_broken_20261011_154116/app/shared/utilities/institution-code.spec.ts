import { generateInstitutionCode, MIN_INSTITUTION_CODE_LENGTH } from './institution-code';

describe('generateInstitutionCode', () => {
  it('builds initials from a multi-word name', () => {
    expect(generateInstitutionCode('Acme Digital Solutions')).toBe('ADS');
  });

  it('strips common corporate suffixes', () => {
    expect(generateInstitutionCode('Acme Technologies Pvt Ltd')).toBe('AT');
  });

  it('strips an LLC suffix', () => {
    expect(generateInstitutionCode('Tech Ventures LLC')).not.toContain('LLC');
  });

  it('pads a single-word name from the name itself', () => {
    expect(generateInstitutionCode('Acme')).toBe('ACM');
  });

  it('never returns fewer than the minimum characters', () => {
    expect(generateInstitutionCode('Acme').length).toBeGreaterThanOrEqual(MIN_INSTITUTION_CODE_LENGTH);
  });

  it('drops special characters', () => {
    expect(generateInstitutionCode('A&B Solutions')).toBe('AS');
  });

  it('only strips a suffix that stands as its own word', () => {
    expect(generateInstitutionCode('Cognizant')).toBe('COG');
    expect(generateInstitutionCode('Incredible Labs')).toBe('IL');
    expect(generateInstitutionCode('Tata Consultancy Services')).toBe('TCS');
  });

  it('falls back to the name when it is nothing but suffixes', () => {
    expect(generateInstitutionCode('Co Ltd.')).toBe('CL');
  });

  it('returns an uppercase code', () => {
    const code = generateInstitutionCode('example company');
    expect(code).toBe(code.toUpperCase());
  });

  it('returns an empty string for an empty name', () => {
    expect(generateInstitutionCode('')).toBe('');
  });
});
