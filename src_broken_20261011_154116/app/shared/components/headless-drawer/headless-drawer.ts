import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DrawerModule } from '@openng/optimus-ui/drawer';

/**
 * Right-hand drawer with no chrome — the projected content owns the whole panel.
 *
 * Owns the `#headless` marker so a template can host several drawers; Optimus
 * resolves projected templates by reference name, which must be unique within a
 * template.
 *
 * `.p-drawer` is a column flex container, so a projected panel is a flex item and
 * `min-height: auto` stops it shrinking below its content — a tall panel overflows
 * the drawer and pushes its own footer off-screen. The wrapper around `ng-content`
 * takes that shrink, giving the panel's `h-full` a bounded height to resolve against.
 */
@Component({
  selector: 'app-headless-drawer',
  imports: [DrawerModule],
  template: `
    <p-drawer
      [(visible)]="visible"
      position="right"
      [dismissible]="dismissible()"
      styleClass="w-full! max-w-[92vw]! sm:w-[30rem]! lg:w-[36rem]!"
    >
      <ng-template #headless>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <ng-content />
        </div>
      </ng-template>
    </p-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadlessDrawer {
  readonly visible = model(false);
  /** Set false when the panel guards unsaved work — a mask click would bypass that guard. */
  readonly dismissible = input(true);
}
