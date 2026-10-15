/**
 * Escapes text for interpolation into an HTML string — for APIs that render through `[innerHTML]`,
 * such as the Optimus `p-confirmDialog` `message`.
 */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
