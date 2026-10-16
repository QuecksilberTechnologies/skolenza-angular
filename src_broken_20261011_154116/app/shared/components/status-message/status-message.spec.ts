import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusMessage } from './status-message';

/** The action slot is projected content, so it needs a host to project from. */
@Component({
  imports: [StatusMessage],
  template: `
    <app-status-message
      severity="error"
      icon="pi pi-exclamation-triangle"
      message="Couldn't load it"
      subMessage="Try again in a moment"
    >
      <button type="button">Retry</button>
    </app-status-message>
  `,
})
class Host {}

describe('StatusMessage', () => {
  const create = async (inputs: Record<string, unknown> = {}) => {
    const fixture: ComponentFixture<StatusMessage> = TestBed.createComponent(StatusMessage);
    fixture.componentRef.setInput('icon', 'pi pi-inbox');
    fixture.componentRef.setInput('message', 'Nothing here');
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusMessage, Host] }).compileComponents();
  });

  it('defaults to the empty palette', async () => {
    const fixture = await create();

    const halo = fixture.nativeElement.querySelector('.rounded-full');
    expect(halo.className).toContain('bg-primary-50');
    expect(fixture.nativeElement.querySelector('i').className).toContain('text-primary');
  });

  // Semantic state is never expressed with `primary`, so failure forks the palette.
  it('paints the error palette on the error severity', async () => {
    const fixture = await create({ severity: 'error' });

    const halo = fixture.nativeElement.querySelector('.rounded-full');
    expect(halo.className).toContain('bg-red-50');
    expect(fixture.nativeElement.querySelector('i').className).toContain('text-red-600');
    expect(halo.className).not.toContain('bg-primary-50');
  });

  // The heading already carries the message; the glyph must not repeat it.
  it('hides the icon from assistive tech', async () => {
    const fixture = await create();

    expect(fixture.nativeElement.querySelector('i').getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the message as a heading and omits an unset sub-message', async () => {
    const fixture = await create();

    expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Nothing here');
    expect(fixture.nativeElement.querySelector('p')).toBeFalsy();
  });

  it('renders the message as an h1 when it is the whole page', async () => {
    const fixture = await create({ headingLevel: 1 });

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Nothing here');
    expect(fixture.nativeElement.querySelector('h3')).toBeFalsy();
  });

  it('projects the action alongside the message', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Couldn't load it");
    expect(text).toContain('Try again in a moment');
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Retry');
  });
});
