import {
  computed,
  DestroyRef,
  Directive,
  effect,
  inject,
  signal,
  Signal,
  Type,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import { BillingCatalogRow } from './billing-store';

/** What a page needs from a `billingCatalogStore()` instance. */
export interface BillingCatalogStoreApi<T> {
  visibleRows: Signal<BillingCatalogRow<T>[]>;
  search: Signal<string>;
  isLoading: Signal<boolean>;
  reload(): void;
  setSearch(search: string): void;
  deactivate(row: T): void;
}

/** The parts of a catalog page that differ between plan prices and tax rules. */
export interface BillingCatalogPageConfig<T> {
  /** `my-menu`'s own code — the billing leaves are not in the `get-host-modules` catalog. */
  moduleCode: string;
  header: { title: string; description: string; icon: string };
  /** Singular and plural noun for the live result count. */
  noun: [one: string, many: string];
  form: {
    component: Type<unknown>;
    title: (isEdit: boolean) => string;
    /** The dialog's `data`, keyed the way the form component reads it. */
    data: (row: T | undefined) => Record<string, unknown>;
  };
  deactivateConfirm: (row: T) => { header: string; message: string };
}

/**
 * Shared behaviour of the two unpaged billing catalogs: permission gates, the row action menu,
 * the add/edit dialog and the deactivate confirmation. Each subclass supplies its store, its
 * config and its own template.
 */
@Directive()
export abstract class BillingCatalogPage<T extends { id: number; isActive: boolean }> {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  abstract readonly store: BillingCatalogStoreApi<T>;
  protected abstract readonly config: BillingCatalogPageConfig<T>;

  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerform(this.config.moduleCode, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerform(this.config.moduleCode, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerform(this.config.moduleCode, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 7 : 6));

  /** An empty grid means "nothing matches" when a search is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(() => this.store.search().trim() !== '');

  /** Announces the new total after a search silently swaps the grid. */
  protected readonly resultSummary = computed(() => {
    if (this.store.isLoading()) {
      return '';
    }
    const total = this.store.visibleRows().length;
    const [one, many] = this.config.noun;
    return `${total} ${total === 1 ? one : many} found`;
  });

  protected readonly selectedRow = signal<BillingCatalogRow<T> | null>(null);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();

    return [
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.openForm(row),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: row?.isActive === false ? 'Already inactive' : 'Deactivate',
              icon: 'pi pi-ban text-red-500! dark:text-red-400!',
              styleClass: 'text-red-500! dark:text-red-400! dark:hover:bg-zinc-700 font-medium',
              disabled: !row?.isActive || !!row?.isDeactivating,
              command: () => row && this.confirmDeactivate(row),
            },
          ]
        : []),
    ];
  });

  constructor() {
    effect(() => {
      const { moduleCode, header } = this.config;
      this.#commonService.setPageHeaderInfo({
        pageTitle: this.#featurePageStore.displayNameOf(moduleCode) ?? header.title,
        pageDescription: header.description,
        pageIcon: header.icon,
        // A single crumb would only repeat the title; the description carries more.
        isBreadcrumbShow: false,
      });
    });
  }

  search(value: string) {
    this.store.setSearch(value);
  }

  /** Opens the add/edit dialog, which closes with `true` after a save. */
  openForm(row?: T) {
    const { form } = this.config;
    const ref = this.#dialogService.open(form.component, {
      header: form.title(!!row),
      style: { width: '90vw', maxWidth: '44rem' },
      contentStyle: { overflow: 'auto' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: form.data(row),
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved: boolean) => {
      if (saved) this.store.reload();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeactivate(row: T) {
    const { header, message } = this.config.deactivateConfirm(row);
    this.#confirmationService.confirm({
      message,
      header,
      icon: 'pi pi-ban text-red-400! text-xl!',
      acceptLabel: 'Deactivate',
      rejectLabel: 'Keep Active',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deactivate(row),
    });
  }
}
