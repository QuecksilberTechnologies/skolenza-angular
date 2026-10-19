/** Text to show for a failed call: the error's own message, or a generic one when it has none. */
export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';
}
