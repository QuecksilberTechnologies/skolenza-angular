declare const settled: unique symbol;

/**
 * A search term `TableSearchInput` has debounced and whitespace-normalised.
 *
 * Only that component mints one, so a store whose setter takes it can fetch on every value without
 * a rate limit of its own — a raw `string` from anywhere else does not compile.
 */
export type SettledSearchTerm = string & { readonly [settled]: true };

/** The cleared box: the one term any caller may hand a store directly, e.g. a filter reset. */
export const NO_SEARCH_TERM = '' as SettledSearchTerm;
