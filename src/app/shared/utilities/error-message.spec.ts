import { describe, expect, it } from 'vitest';

import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it("uses an error's own message", () => {
    expect(errorMessage(new Error('Unable to reach the server.'))).toBe(
      'Unable to reach the server.',
    );
  });

  it('falls back to a generic message for anything else', () => {
    expect(errorMessage(new Error(''))).toBe('Something went wrong. Please try again.');
    expect(errorMessage({ status: 500 })).toBe('Something went wrong. Please try again.');
  });
});
