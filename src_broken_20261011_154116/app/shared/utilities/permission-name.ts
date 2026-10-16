/**
 * The lookup key for a module code or operation name as the backend spells it.
 *
 * Case- and whitespace-insensitive. The backend spells two operations with a space
 * (`Allow Editing`, `Resend Credentials`) and is not consistent about capitalisation - `Inactive`
 * and `InActive` are one operation - so any table keyed on these strings has to normalise before
 * it looks up. A key that loses or doubles a space silently resolves nothing: an operation id that
 * never arrives reads as a permission problem rather than the typo it is, and a missing icon
 * quietly degrades to the fallback glyph.
 *
 * Shared so the two permission id spaces at least agree on what one name is:
 * `core/feature-page-identifiers.ts` keys the `my-menu` tree with it, and
 * `shared/components/permission-matrix` keys its display tables with it.
 */
export function normalisePermissionName(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}
