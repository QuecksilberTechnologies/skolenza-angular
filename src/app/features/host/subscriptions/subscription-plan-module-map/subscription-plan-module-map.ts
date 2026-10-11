import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { TreeModule } from '@openng/optimus-ui/tree';
import { catchError, finalize, map, of, tap } from 'rxjs';

import { Common, PlanModuleMappingApi } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { SubscriptionPlan } from '@shared/interfaces';

import {
  collectMappedIds,
  flattenNodes,
  markPartialSelection,
  ModuleTreeNode,
  nodesForIds,
  selectedModuleIds,
  subtreeIds,
  toModuleTreeNodes,
  withExpanded,
  withoutPartialSelection,
} from './subscription-plan-module-map.model';

@Component({
  selector: 'app-subscription-plan-module-map',
  imports: [ButtonModule, RouterLink, TableEmptyMessage, TableLoader, TooltipModule, TreeModule],
  templateUrl: './subscription-plan-module-map.html',
  styleUrl: './subscription-plan-module-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SubscriptionPlanModuleMap {
  readonly #planModuleMappingApi = inject(PlanModuleMappingApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);

  protected readonly plan: SubscriptionPlan = this.#dynamicDialogConfig.data.plan;

  protected readonly optionsResource = rxResource({
    params: () => ({ subscriptionPlanId: this.plan.id }),
    stream: ({ params: { subscriptionPlanId } }) =>
      this.#planModuleMappingApi.getPlanModuleOptions(subscriptionPlanId).pipe(
        tap((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        }),
        map((res) => res.data?.modules ?? []),
        // `BaseService.handleError` rethrows, so the dialog has to answer for it itself.
        catchError((err: Error) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([]);
        }),
      ),
  });

  protected readonly isLoading = computed(() => this.optionsResource.isLoading());

  /** A signal rather than a computed: the bulk actions mutate `expanded` on the nodes in place. */
  protected readonly nodes = signal<ModuleTreeNode[]>([]);

  protected readonly selection = signal<ModuleTreeNode[]>([]);

  /**
   * Mapped ids `p-tree` cannot carry in its own selection: a branch the API returned mapped while
   * its children are not. They are put back on save, and dropped as soon as the user unticks that
   * subtree. Nothing is ever inferred into this set — an ancestor that is only indeterminate
   * because a descendant is mapped is not itself mapped.
   */
  readonly #preservedIds = signal<ReadonlySet<number>>(new Set<number>());

  /** What the dialog would save the moment it opened, so Save stays disabled until something moves. */
  #initialIds: number[] = [];
  protected readonly isSaving = signal(false);

  protected readonly moduleIds = computed(() =>
    selectedModuleIds(this.selection(), this.#preservedIds()),
  );
  protected readonly totalModules = computed(() => flattenNodes(this.nodes()).length);

  /** Four labelled actions do not fit a phone, so below `sm` they fall back to icons. */
  readonly #breakpointObserver = inject(BreakpointObserver);
  protected readonly isCompact = toSignal(
    this.#breakpointObserver.observe('(max-width: 639px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly isDirty = computed(() => {
    const ids = this.moduleIds();
    return (
      ids.length !== this.#initialIds.length || ids.some((id, i) => id !== this.#initialIds[i])
    );
  });

  constructor() {
    // The options arrive asynchronously, so the initial selection has to be seeded from the
    // resource rather than set up once in the constructor.
    effect(() => {
      const modules = this.optionsResource.value() ?? [];
      const nodes = toModuleTreeNodes(modules);
      const mapped = new Set(collectMappedIds(modules));

      markPartialSelection(nodes, mapped);
      // A partially selected branch is never in `p-tree`'s selection — it is restored on save.
      const seeded = nodesForIds(nodes, mapped).filter((node) => !node.partialSelected);
      const seededIds = new Set(seeded.map((node) => node.data as number));
      const preserved = new Set([...mapped].filter((id) => !seededIds.has(id)));

      this.nodes.set(nodes);
      this.selection.set(seeded);
      this.#preservedIds.set(preserved);
      this.#initialIds = selectedModuleIds(seeded, preserved);
    });
  }

  protected selectAll() {
    const nodes = this.#clearIndeterminate();
    this.#preservedIds.set(new Set());
    this.selection.set(flattenNodes(nodes));
  }

  protected clearAll() {
    this.#clearIndeterminate();
    this.#preservedIds.set(new Set());
    this.selection.set([]);
  }

  /**
   * Unticking a branch unmaps everything under it, the preserved rows included. The node comes
   * from `p-tree`, which hands back its filtered copy while the search box has text, so the ids
   * are resolved against the real tree rather than read off the node that arrived.
   */
  protected onNodeUnselect(node?: ModuleTreeNode) {
    const dropped = node ? subtreeIds(this.nodes(), node.data as number) : [];
    if (!dropped.length) {
      return;
    }

    this.#preservedIds.update((ids) => {
      const next = new Set(ids);
      for (const id of dropped) {
        next.delete(id);
      }
      return next;
    });
  }

  /** `partialSelected` is a plain property on an `OnPush` input, so clearing it needs new nodes. */
  #clearIndeterminate(): ModuleTreeNode[] {
    const nodes = withoutPartialSelection(this.nodes());
    this.nodes.set(nodes);
    return nodes;
  }

  /** Re-fetches the catalog; the seeding effect rebuilds the tree, so unsaved ticks are dropped. */
  protected refresh() {
    this.optionsResource.reload();
  }

  protected expandAll() {
    this.#setExpanded(true);
  }

  protected collapseAll() {
    this.#setExpanded(false);
  }

  /** `withExpanded` returns fresh nodes, so the selection has to be re-pointed at them. */
  #setExpanded(expanded: boolean) {
    const checked = new Set(this.selection().map((node) => node.data as number));
    const nodes = withExpanded(this.nodes(), expanded);

    this.nodes.set(nodes);
    this.selection.set(nodesForIds(nodes, checked));
  }

  protected save() {
    this.isSaving.set(true);

    this.#planModuleMappingApi
      .savePlanModuleMapping({
        subscriptionPlanId: this.plan.id,
        moduleIds: this.moduleIds(),
        // Sent explicitly so the DTO always arrives complete, rather than relying on the server
        // treating the field as optional.
        remark: null,
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
            return;
          }

          this.#commonService.showMessage(res.message, 'success');
          this.#dialogRef.close(true);
        },
        error: (err: Error) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  protected onCancel() {
    this.#dialogRef.close();
  }
}
