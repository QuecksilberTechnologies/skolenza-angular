import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  let fixture: ComponentFixture<UserAvatar>;

  /** Seeds the inputs under test, then renders. */
  const create = async (inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({
      imports: [UserAvatar],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAvatar);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  };

  const badge = () => fixture.nativeElement.querySelector('p-overlaybadge');
  const avatar = () => fixture.nativeElement.querySelector('p-avatar');
  const statusText = () => fixture.nativeElement.querySelector('.sr-only')?.textContent?.trim();

  it('should create', async () => {
    await create();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // The dot is opt-in: a caller who wants a bare avatar should not inherit a badge wrapper.
  it('renders no badge when isActive is left unset', async () => {
    await create({ name: 'Deepesh' });

    expect(avatar()).toBeTruthy();
    expect(badge()).toBeNull();
  });

  it('names the status for screen readers', async () => {
    await create({ name: 'Deepesh', isActive: true });
    expect(statusText()).toBe('Active');

    fixture.componentRef.setInput('isActive', false);
    fixture.detectChanges();
    expect(statusText()).toBe('Inactive');
  });

  // `false` is a real status, not "no status" - it must still render the red dot.
  it('renders the badge for an inactive user', async () => {
    await create({ name: 'Deepesh', isActive: false });

    expect(badge()).toBeTruthy();
  });

  it('takes domain wording for the status', async () => {
    await create({
      name: 'Deepesh',
      isActive: true,
      statusLabels: { active: 'Online', inactive: 'Offline' },
    });

    expect(statusText()).toBe('Online');
  });

  // object-cover only means something when there is an image to crop.
  it('applies object-cover only alongside an image', async () => {
    await create({ name: 'Deepesh' });
    expect(avatar().className).not.toContain('object-cover!');

    fixture.componentRef.setInput('imagePath', '/photo.png');
    fixture.detectChanges();
    expect(avatar().className).toContain('object-cover!');
  });

  it('renders the photo instead of the initial when one is supplied', async () => {
    await create({ name: 'Deepesh', imagePath: '/photo.png' });

    expect(avatar().querySelector('img')?.getAttribute('src')).toBe('/photo.png');
    expect(avatar().textContent?.trim()).toBe('');
  });

  // The names the person sees come from an accessible name on the img, not an alt attribute.
  it('names the photo for screen readers', async () => {
    await create({ name: 'Deepesh', imagePath: '/photo.png' });

    expect(avatar().querySelector('img')?.getAttribute('aria-label')).toBe('Deepesh');
  });

  // Regression: one instance reused across people - a @for row, or a drawer reopened on
  // someone else - must not keep the first person's letter once a photo arrives.
  it('swaps initial for photo when the inputs change on a live instance', async () => {
    await create({ name: 'Alice' });
    expect(avatar().textContent?.trim()).toBe('A');

    fixture.componentRef.setInput('name', 'Bob');
    fixture.componentRef.setInput('imagePath', '/bob.png');
    fixture.detectChanges();

    expect(avatar().querySelector('img')?.getAttribute('src')).toBe('/bob.png');
    expect(avatar().textContent?.trim()).toBe('');
  });

  it('swaps photo back for an initial', async () => {
    await create({ name: 'Alice', imagePath: '/alice.png' });

    fixture.componentRef.setInput('name', 'Bob');
    fixture.componentRef.setInput('imagePath', null);
    fixture.detectChanges();

    expect(avatar().querySelector('img')).toBeNull();
    expect(avatar().textContent?.trim()).toBe('B');
  });

  // An empty string is a missing photo, not a photo at an empty URL.
  it('treats an empty path as no image', async () => {
    await create({ name: 'Deepesh', imagePath: '' });

    expect(avatar().textContent?.trim()).toBe('D');
  });
});
