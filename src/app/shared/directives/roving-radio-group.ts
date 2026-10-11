import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

/**
 * Applies the APG radio-group keyboard pattern to an element that already carries
 * `role="radiogroup"` with `role="radio"` children: a single tab stop plus
 * Arrow/Home/End navigation that moves focus and selects.
 */
@Directive({
  selector: '[appRovingRadioGroup]',
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'syncTabStops()',
    '(click)': 'syncTabStops()',
  },
})
export class RovingRadioGroup {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.syncTabStops());
  }

  onKeydown(event: KeyboardEvent): void {
    const radios = this.#radios();
    if (!radios.length) {
      return;
    }

    const current = radios.indexOf(document.activeElement as HTMLElement);
    let target: number;

    if (NEXT_KEYS.includes(event.key)) {
      target = current < 0 ? 0 : (current + 1) % radios.length;
    } else if (PREVIOUS_KEYS.includes(event.key)) {
      target = current < 0 ? radios.length - 1 : (current - 1 + radios.length) % radios.length;
    } else if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = radios.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    radios[target].focus();
    radios[target].click();
    this.syncTabStops();
  }

  syncTabStops(): void {
    const radios = this.#radios();
    if (!radios.length) {
      return;
    }

    const active =
      radios.find((radio) => radio.getAttribute('aria-checked') === 'true') ??
      radios.find((radio) => radio === document.activeElement) ??
      radios[0];

    for (const radio of radios) {
      radio.tabIndex = radio === active ? 0 : -1;
    }
  }

  #radios(): HTMLElement[] {
    return Array.from(this.#host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]'));
  }
}
