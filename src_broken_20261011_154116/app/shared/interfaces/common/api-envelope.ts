/**
 * The envelope every `*-api.ts` call answers with, narrowed to the three fields callers read.
 *
 * Structural, so a concrete response interface satisfies it without declaring that it does.
 * The per-feature envelopes (`PmsResponse`, `OkrApiResponse`, `TaskApiResponse`, …) are older
 * hand-rolled copies of this shape; they can collapse onto it as each is touched.
 */
export interface ApiEnvelope<T> {
  isSucceeded: boolean;
  message: string;
  data: T;
}
