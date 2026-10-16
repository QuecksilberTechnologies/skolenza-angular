import { PrimeIconPipe } from './prime-icon-pipe';

describe('PrimeIconPipe', () => {
  const pipe = new PrimeIconPipe();

  it.each([
    ['pi pi-flag', 'pi pi-flag'],
    [' pi-flag pi ', 'pi-flag pi'],
    ['bi bi-calendar-event', null],
    ['string', null],
    ['', null],
    [null, null],
  ])('maps %j to %j', (icon, expected) => {
    expect(pipe.transform(icon)).toBe(expected);
  });
});
