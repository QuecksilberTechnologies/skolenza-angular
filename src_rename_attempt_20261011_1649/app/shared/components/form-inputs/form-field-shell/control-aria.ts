/**
 * ARIA wiring for an Optimus control's focusable element.
 *
 * `[attr.aria-*]` on an Optimus tag lands on the component host, which is never
 * the element that takes focus — a screen reader on the inner input or combobox
 * would hear neither the hint, the error, nor "required". Hand the result to the
 * control's pass-through (`[pt]="{ label: aria() }"`), keyed by the section that
 * renders its focusable element, and Optimus' `pBind` sets the attributes there.
 *
 * `null` removes the attribute rather than writing `aria-required="false"`.
 */
export function controlAria(inputId: string, required = false) {
  return {
    'aria-describedby': `${inputId}-help`,
    'aria-required': required ? 'true' : null,
  };
}
