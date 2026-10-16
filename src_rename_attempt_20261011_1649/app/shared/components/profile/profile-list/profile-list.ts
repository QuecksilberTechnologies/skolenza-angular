import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Bordered, divided container for `app-profile-list-item` rows. */
@Component({
  selector: 'app-profile-list',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'list',
    class:
      'block divide-y divide-zinc-200 rounded-[0.8rem] border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800',
  },
})
export class ProfileList {}
