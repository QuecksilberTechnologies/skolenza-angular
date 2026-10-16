import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { CurrentUserPermissionsStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { GetCampusTypePipe } from '@shared/pipes';

import { LocationsCardStore } from './locations-card.store';

@Component({
  selector: 'app-locations-card',
  imports: [
    ButtonModule,
    CardModule,
    GetCampusTypePipe,
    RouterLink,
    TableEmptyMessage,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './locations-card.html',
  providers: [LocationsCardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsCard {
  readonly title = input<string>();

  protected readonly store = inject(LocationsCardStore);

  /** Shimmer placeholders stand in at row height so the card cannot jump when the data lands. */
  protected readonly skeletonRows = [1, 2, 3];

  readonly #permissionsStore = inject(CurrentUserPermissionsStore);

  /**
   * `/app/campuses/new` is guarded by `hasModuleOperationGuard('Attendance', 'Add')`, so a
   * link a view-only role can see would only bounce them back.
   */
  protected readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform('Attendance', 'Add'),
  );
}
