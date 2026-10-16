import { GetRelationNamePipe } from './get-relation-name-pipe';

describe('GetRelationNamePipe', () => {
  const relations = [
    { id: 1, code: 'FATHER', label: 'Father' },
    { id: 16, code: 'OWNER', label: 'Owner' },
  ];

  it('resolves labels from the API-supplied catalogue', () => {
    expect(new GetRelationNamePipe().transform(16, relations)).toBe('Owner');
  });

  it('returns a placeholder for null or unknown relations', () => {
    const pipe = new GetRelationNamePipe();
    expect(pipe.transform(null, relations)).toBe('-');
    expect(pipe.transform(99, relations)).toBe('-');
  });
});
