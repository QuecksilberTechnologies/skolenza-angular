/**
 * The slice of `FieldState` these helpers read. Typing against the slice rather than
 * `Field<T>` or `FieldTree<T>` is deliberate: those two are not assignable to each other
 * (`FieldTree` maps its type parameter through a Reactive-Forms compat conditional), and
 * callers hold one or the other depending on whether they took the field as a component
 * input or read it off their own `form()`.
 */
interface FieldErrorState {
  errorSummary(): readonly { readonly message?: string }[];
  touched(): boolean;
  dirty(): boolean;
}

/** Anything callable to a field state — `Field<T>` and `FieldTree<T>` both are. */
type ErrorReadableField = () => FieldErrorState;

/*
 * `errorSummary()` rather than `errors()`: zod attaches an issue at the path it was raised
 * on, so a bad element of an array field lands on the child node (`projectWindow[1]`), not
 * on the field the control is bound to. `errors()` misses those entirely — a half-picked
 * date range would show nothing. `errorSummary()` includes descendants, and is identical to
 * `errors()` for the scalar fields that make up most of the set.
 */

/**
 * Whether a Signal Forms field has earned a visible error message.
 *
 * Blur alone is not enough: tabbing through an untouched form would paint every required
 * field at once. A field speaks up when the user has actually edited it, or once the form
 * has been submitted.
 */
export function showFieldError(field: ErrorReadableField, submitted: boolean): boolean {
  const state = field();
  return state.errorSummary().length > 0 && (submitted || (state.touched() && state.dirty()));
}

/**
 * First validation message on the field, or `undefined` when it has none. zod issues reach
 * the field through the same channel the built-in validators used, so no per-field mapping
 * is needed — see `.claude/docs/forms.md`.
 */
export function fieldErrorMessage(field: ErrorReadableField): string | undefined {
  // `message` is optional on `ValidationError`: the built-in `required()` / `min()`
  // validators omit it unless one is passed. Taking `[0]` blindly would render an empty
  // red box, so the first error that actually has something to say wins.
  return field()
    .errorSummary()
    .find((error) => error.message)?.message;
}
