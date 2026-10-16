import { Directive, effect, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: '[appIndeterminate]',
})
export class IndeterminateCheckbox {
  readonly appIndeterminate = input(false);
  readonly #el = inject(ElementRef);

  constructor() {
    effect(() => {
      const indeterminate = this.appIndeterminate();
      const input = this.#el.nativeElement.querySelector('input[type="checkbox"]');
      if (input) {
        input.indeterminate = indeterminate;
      }
    });
  }
}
