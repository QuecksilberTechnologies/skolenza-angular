import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { OverlayBadgeModule } from '@openng/optimus-ui/overlaybadge';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { avatarBackgroundColor, avatarInitial } from '@shared/directives/avatar-color';

/** Sizes `p-avatar` understands. Tailwind classes on the host still win where a call site needs them. */
export type UserAvatarSize = 'normal' | 'large' | 'xlarge';

/**
 * Circular avatar for any person - staffMember, host user, agent, assignee - with an optional
 * live status dot.
 *
 * Roughly thirty call sites were each repeating the same four decisions: photo or initial,
 * the colour {@link avatarBackgroundColor} derives from the name, the `text-white! uppercase`
 * class string, and `object-cover!` only when there is an image to crop. Several also spelled
 * the image-or-initial choice as two sibling `p-avatar` elements under `@if`, which this
 * collapses into one.
 *
 * The initial goes through `p-avatar`'s own `label` rather than the `appAvatarColor` directive:
 * that directive writes `textContent`, destroying the component's internal DOM, so an avatar
 * reused across people (a `@for` row, a drawer reopened on someone else) would keep showing the
 * first person's letter once a photo arrived.
 *
 * The dot is status and nothing else: green when active, red when not, matching
 * `isActive ? 'success' : 'danger'` everywhere else in the app. Leave {@link isActive} unset
 * and no dot renders - a decorative "click me" badge is the caller's to add, as is any click
 * or keyboard handling, which belongs on the caller's own wrapper.
 */
@Component({
  selector: 'app-user-avatar',
  imports: [AvatarModule, OverlayBadgeModule, TooltipModule, NgTemplateOutlet],
  templateUrl: './user-avatar.html',
  host: { class: 'inline-flex' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatar {
  /** Photo URL. Empty or missing falls back to the initial drawn from {@link name}. */
  readonly imagePath = input<string | null>();

  /** Seeds the initial and its deterministic background colour. */
  readonly name = input<string | null>();

  /** Omit for no dot. The dot reports status, never a click affordance. */
  readonly isActive = input<boolean>();

  readonly size = input<UserAvatarSize>('normal');

  readonly shape = input<'circle' | 'square'>('circle');

  /**
   * Classes for the avatar itself, not the host - sizing (`size-9!`), rings and type scale.
   * Call sites almost always override `p-avatar`'s own `size` token this way, so the classes
   * have to reach past the host element to land on it.
   */
  readonly avatarClass = input('');

  /** Overrides the dot's "Active"/"Inactive" wording where the domain calls it something else. */
  readonly statusLabels = input<{ active: string; inactive: string }>({
    active: 'Active',
    inactive: 'Inactive',
  });

  /** `p-avatar` takes `string | undefined`, and an empty path is as good as none. */
  protected readonly image = computed(() => this.imagePath() || undefined);

  protected readonly initial = computed(() => avatarInitial(this.name() ?? ''));

  protected readonly background = computed(() => avatarBackgroundColor(this.name() ?? ''));

  protected readonly statusLabel = computed(() =>
    this.isActive() ? this.statusLabels().active : this.statusLabels().inactive,
  );

  /** `object-cover` only means something when there is an image to crop. */
  protected readonly classes = computed(() =>
    [this.image() ? 'object-cover!' : '', this.avatarClass()].filter(Boolean).join(' '),
  );
}
