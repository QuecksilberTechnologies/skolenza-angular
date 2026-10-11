import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

/**
 * `p-card` with a projected title.
 *
 * Owns the `#title` / `#subtitle` markers so a template can host several cards —
 * Optimus resolves projected templates by reference name, which must be unique
 * within a template.
 *
 * Pass {@link heading} (and optionally {@link icon}) to get a real `<h2>`, so a page of
 * cards has a heading outline. The `[cardTitle]` projection stays as the escape hatch
 * for headers that need markup the two inputs can't express.
 *
 * The host is `display: contents`, so grid/flex classes passed via
 * {@link cardClass} apply to the card itself.
 */
@Component({
  selector: 'app-section-card',
  imports: [CardModule],
  template: `
    <p-card [class]="cardClass()">
      <ng-template #title>
        @if (heading()) {
          <h2 class="flex items-center gap-2 font-semibold">
            @if (icon()) {
              <i [class]="icon() + ' text-primary-500'" aria-hidden="true"></i>
            }
            <span>{{ heading() }}</span>
          </h2>
        } @else {
          <ng-content select="[cardTitle]" />
        }
      </ng-template>
      @if (subheading()) {
        <ng-template #subtitle>{{ subheading() }}</ng-template>
      }
      <ng-content />
    </p-card>
  `,
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionCard {
  readonly cardClass = input('');
  readonly subheading = input<string>();

  /** Renders the header as an `<h2>`; without it the `[cardTitle]` projection is used. */
  readonly heading = input<string>();
  /** `pi pi-*` class for the decorative icon beside {@link heading}. */
  readonly icon = input<string>();
}
