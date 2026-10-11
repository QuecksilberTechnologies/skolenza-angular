import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Optimus icon gallery — the source of truth for both web and mobile icon names. */
const ICON_LIST_URL = 'https://optimus.openng.org/icons#list';

/** Form hint that points at the Optimus icon list, for any field taking an icon name. */
@Component({
  selector: 'app-icon-help-link',
  template: `
    <p [class]="hintClass()">
      {{ hint() }}
      <a
        [href]="iconListUrl"
        target="_blank"
        rel="noopener noreferrer"
        [attr.aria-label]="linkText() + ' (opens in new tab)'"
        class="text-primary hover:underline"
      >
        {{ linkText() }}
      </a>
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconHelpLink {
  /** Sentence shown before the link, e.g. `PrimeIcons class name.` */
  readonly hint = input.required<string>();
  readonly linkText = input('Browse icons');
  /** Hint paragraph classes; override where the host form uses the token text styles. */
  readonly hintClass = input('text-xs text-gray-500 dark:text-zinc-400');

  protected readonly iconListUrl = ICON_LIST_URL;
}
