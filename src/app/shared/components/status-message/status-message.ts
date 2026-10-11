import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** `empty` is "nothing here yet"; `error` is "we could not read it". Only the palette differs. */
export type StatusMessageSeverity = 'empty' | 'error';

/** The message is a heading: `h3` suits a region inside a page, `h1` is for when it *is* the page. */
export type StatusMessageHeadingLevel = 1 | 3;

/**
 * Centred icon + message + optional action, for a region that has no content to show.
 *
 * Distinct from `table-empty-message`, which is scoped to a `#emptymessage` table cell, bakes in
 * its own `py-12`, and has no action slot — which is why both of its error consumers had to bolt a
 * Retry button on as a sibling. This one projects its action, so message and recovery stay one
 * group.
 *
 * Outer padding and vertical position belong to the caller: a drawer branch fills its panel, a
 * block inside a card must not.
 */
@Component({
  selector: 'app-status-message',
  imports: [],
  templateUrl: './status-message.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusMessage {
  readonly icon = input.required<string>();
  readonly message = input.required<string>();
  readonly subMessage = input<string>();
  readonly severity = input<StatusMessageSeverity>('empty');
  readonly headingLevel = input<StatusMessageHeadingLevel>(3);

  protected readonly headingClass = 'mb-1 text-lg font-semibold text-gray-700 dark:text-zinc-100';
}
