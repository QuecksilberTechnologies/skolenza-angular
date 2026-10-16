import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { TagModule } from '@openng/optimus-ui/tag';
import { map } from 'rxjs';

import { SubModuleApi } from '@core/services';
import {
  DEFAULT_MODULE_SCOPE_KEY,
  ModuleRow,
  moduleIcon,
  moduleScopeKeyOf,
} from '@shared/interfaces';

@Component({
  selector: 'app-parent-sub-modules-detail',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule, TagModule],
  templateUrl: './parent-sub-modules-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSubModulesDetail {
  readonly #subModuleApi = inject(SubModuleApi);

  readonly parentModule = input.required<ModuleRow>();
  readonly closePopup = output<void>();

  readonly #subModulesResource = rxResource({
    params: () => ({ id: this.parentModule().id, moduleScope: this.parentModule().moduleScope }),
    stream: ({ params }) =>
      this.#subModuleApi
        .getSubModules({ moduleScope: params.moduleScope, parentModuleId: params.id })
        .pipe(
          map((res) => {
            // A rejected envelope is a failure, not an empty parent — collapsing the two made a
            // server-side error read as "No child modules under this parent yet."
            if (!res.isSucceeded) {
              throw new Error(res.message || 'Could not load child modules.');
            }
            return res.data ?? [];
          }),
        ),
  });

  /** The drill-down link carries the key, not the number — `1` cannot say Institution from Common. */
  readonly scopeKey = computed(
    () => moduleScopeKeyOf(this.parentModule()) ?? DEFAULT_MODULE_SCOPE_KEY,
  );

  readonly subModules = computed(() => this.#subModulesResource.value() ?? []);
  readonly isLoading = computed(() => this.#subModulesResource.isLoading());
  readonly hasError = computed(() => !!this.#subModulesResource.error());
  readonly errorMessage = computed(() => {
    const error = this.#subModulesResource.error();
    return error instanceof Error && error.message
      ? error.message
      : 'Could not load child modules.';
  });

  readonly iconOf = moduleIcon;
}
