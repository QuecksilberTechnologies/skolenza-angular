import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One row of an `app-profile-list`. Slots: `[badges]` beside the title, `[meta]` items joined by
 * dots on the second line, default content below that, and `[actions]` centred on the right.
 */
@Component({
  selector: 'app-profile-list-item',
  templateUrl: './profile-list-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    class: 'flex items-center justify-between gap-3 px-4 py-3',
  },
})
export class ProfileListItem {
  readonly title = input.required<string>();
}
