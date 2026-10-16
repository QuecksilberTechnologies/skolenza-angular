import { flagUrl } from './flag-url';

describe('flagUrl', () => {
  it('lowercases the ISO code into the flagcdn path', () => {
    expect(flagUrl('IN')).toBe('https://flagcdn.com/16x12/in.webp');
    expect(flagUrl('US')).toBe('https://flagcdn.com/16x12/us.webp');
  });

  it('maps the United Kingdom to `gb`, which is the code flagcdn actually serves', () => {
    expect(flagUrl('UK')).toBe('https://flagcdn.com/16x12/gb.webp');
  });

  it('leaves the segment empty when no code is known, rather than throwing', () => {
    expect(flagUrl(undefined)).toBe('https://flagcdn.com/16x12/.webp');
    expect(flagUrl('')).toBe('https://flagcdn.com/16x12/.webp');
  });
});
