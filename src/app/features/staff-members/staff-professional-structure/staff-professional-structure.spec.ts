import { describe, expect, it } from 'vitest';

import { buildDependencyOptions } from './staff-professional-structure';

describe('StaffProfessionalStructure dependency options', () => {
  const values = [
    { id: 1, name: 'Teaching Staff', isActive: true },
    { id: 2, name: 'Head Mistress', isActive: false },
    { id: 3, name: 'Student Services', isActive: true },
  ];

  it('excludes inactive dependencies while adding a new record', () => {
    const options = buildDependencyOptions(values, new Set<number>());

    expect(options.map((item) => item.name)).toEqual(['Teaching Staff', 'Student Services']);
    expect(options.every((item) => !item.disabled)).toBe(true);
  });

  it('keeps an already selected inactive dependency visible and disabled while editing', () => {
    const options = buildDependencyOptions(values, new Set([2]));
    const inactiveSelection = options.find((item) => item.id === 2);

    expect(inactiveSelection).toEqual({
      id: 2,
      name: 'Head Mistress',
      isActive: false,
      disabled: true,
    });
  });

  it('keeps active selected dependencies enabled', () => {
    const options = buildDependencyOptions(values, new Set([1]));

    expect(options.find((item) => item.id === 1)?.disabled).toBe(false);
  });
});
