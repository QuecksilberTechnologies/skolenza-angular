import { Clipboard } from '@angular/cdk/clipboard';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomColorsApi } from '@core/services';
import { ACCENT_COLORS } from '@shared/interfaces';

import { ColorPicker } from './color-picker';

class FakeCustomColorsApi {
  readonly #colors = signal<string[]>([]);
  readonly colors = this.#colors.asReadonly();

  seed(colors: string[]) {
    this.#colors.set(colors);
  }
  async load() {}
  async add(hex: string) {
    this.#colors.update((colors) => [hex, ...colors]);
  }
  async remove(hex: string) {
    this.#colors.update((colors) => colors.filter((c) => c !== hex));
  }
}

@Component({
  imports: [ColorPicker],
  template: `
    <app-color-picker [value]="value" (valueChange)="picked = $event" />
  `,
})
class Host {
  value = ACCENT_COLORS[0].value;
  picked: string | null = null;
}

describe('ColorPicker', () => {
  let fixture: ComponentFixture<Host>;

  const trigger = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const panel = () => document.querySelector('app-color-picker-panel');
  const field = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`);
  const addButton = () =>
    document.querySelector<HTMLButtonElement>('app-color-picker-panel p-button button')!;
  const formToggle = () =>
    document.querySelector<HTMLButtonElement>(
      'app-color-picker-panel [aria-controls="color-picker-custom-form"]',
    )!;

  const openCustomForm = () => {
    formToggle().click();
    fixture.detectChanges();
  };

  const type = (id: string, text: string) => {
    const input = field(id)!;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: CustomColorsApi, useClass: FakeCustomColorsApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('opens the overlay panel when the trigger is clicked', () => {
    expect(panel()).toBeNull();

    trigger().click();
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('renders every preset color in the panel', () => {
    trigger().click();
    fixture.detectChanges();

    const swatches = document.querySelectorAll('app-color-picker-panel [role="radio"]');
    expect(swatches.length).toBe(ACCENT_COLORS.length);
  });

  it('emits the picked color and closes', () => {
    trigger().click();
    fixture.detectChanges();

    const swatches = document.querySelectorAll<HTMLButtonElement>(
      'app-color-picker-panel [role="radio"]',
    );
    swatches[3].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked).toBe(ACCENT_COLORS[3].value);
    expect(panel()).toBeNull();
  });

  it('keeps a single tab stop and moves selection with arrow keys', async () => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    const swatches = Array.from(
      document.querySelectorAll<HTMLButtonElement>('app-color-picker-panel [role="radio"]'),
    );
    expect(swatches.filter((swatch) => swatch.tabIndex === 0).length).toBe(1);

    swatches[0].focus();
    document
      .querySelector('app-color-picker-panel [role="radiogroup"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.picked).toBe(ACCENT_COLORS[1].value);
  });

  it('shows the selected hex in the footer', () => {
    trigger().click();
    fixture.detectChanges();

    const footer = document.querySelector('app-color-picker-panel')!.textContent ?? '';
    expect(footer).toContain('Selected color');
    expect(footer).toContain(`#${ACCENT_COLORS[0].value.replace('#', '').toUpperCase()}`);
  });

  it('previews the hovered swatch in the footer and restores on leave', () => {
    trigger().click();
    fixture.detectChanges();

    const swatches = document.querySelectorAll<HTMLButtonElement>(
      'app-color-picker-panel [role="radio"]',
    );
    const footer = () => document.querySelector('app-color-picker-panel')!.textContent ?? '';

    swatches[5].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(footer()).toContain(ACCENT_COLORS[5].name);
    expect(footer()).toContain(`#${ACCENT_COLORS[5].value.replace('#', '').toUpperCase()}`);

    swatches[5].dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(footer()).toContain('Selected color');
    expect(footer()).toContain(`#${ACCENT_COLORS[0].value.replace('#', '').toUpperCase()}`);
  });

  it('copies the selected color even while another swatch is hovered', () => {
    trigger().click();
    fixture.detectChanges();

    const swatches = document.querySelectorAll<HTMLButtonElement>(
      'app-color-picker-panel [role="radio"]',
    );
    swatches[5].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const copy = vi.spyOn(TestBed.inject(Clipboard), 'copy');
    document
      .querySelector<HTMLButtonElement>('app-color-picker-panel [aria-label^="Copy"]')!
      .click();

    expect(copy).toHaveBeenCalledWith(ACCENT_COLORS[0].value);
  });

  it('hides the custom color form until it is requested', () => {
    trigger().click();
    fixture.detectChanges();

    expect(field('color-picker-hex')).toBeNull();

    openCustomForm();

    expect(field('color-picker-hex')).not.toBeNull();
    expect(formToggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('collapses the form again on Cancel without changing the color', () => {
    trigger().click();
    fixture.detectChanges();

    openCustomForm();
    type('color-picker-hex', '991B1B');
    formToggle().click();
    fixture.detectChanges();

    expect(field('color-picker-hex')).toBeNull();
    expect(fixture.componentInstance.picked).toBeNull();
  });

  it('reseeds the fields with the selected color each time the form opens', () => {
    trigger().click();
    fixture.detectChanges();

    openCustomForm();
    type('color-picker-hex', 'nonsense');
    formToggle().click();
    fixture.detectChanges();
    openCustomForm();

    expect(field('color-picker-hex')!.value).toBe(ACCENT_COLORS[0].value.toUpperCase());
  });

  it('prefills both fields with the selected color', () => {
    trigger().click();
    fixture.detectChanges();
    openCustomForm();

    expect(field('color-picker-hex')!.value).toBe(ACCENT_COLORS[0].value.toUpperCase());
    expect(field('color-picker-rgb')!.value).toBe('66, 135, 245');
  });

  it('mirrors a typed hex into the rgb field', () => {
    trigger().click();
    fixture.detectChanges();
    openCustomForm();

    type('color-picker-hex', '991B1B');

    expect(field('color-picker-rgb')!.value).toBe('153, 27, 27');
  });

  it('applies and saves the typed color when Add color is pressed', async () => {
    trigger().click();
    fixture.detectChanges();
    openCustomForm();

    type('color-picker-hex', '991B1B');
    addButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked).toBe('#991b1b');
    expect(TestBed.inject(CustomColorsApi).colors()).toContain('#991b1b');
    expect(panel()).toBeNull();
  });

  it('disables Add color for an already saved color', () => {
    (TestBed.inject(CustomColorsApi) as unknown as FakeCustomColorsApi).seed(['#991b1b']);
    trigger().click();
    fixture.detectChanges();
    openCustomForm();

    type('color-picker-hex', '991B1B');

    expect(addButton().disabled).toBe(true);
    expect(document.querySelector('app-color-picker-panel')!.textContent).toContain(
      'This color is already saved.',
    );
  });

  it('closes on Escape', () => {
    trigger().click();
    fixture.detectChanges();

    const overlay = document.querySelector('.cdk-overlay-container')!;
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });
});
