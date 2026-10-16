import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FieldTree, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';

import {
  Common,
  MenuStructureApi,
  ModuleOperationApi,
  OperationsMasterApi,
  ParentModuleApi,
  SubModuleApi,
} from '@core/services';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { IconHelpLink } from '@shared/components/icon-help-link/icon-help-link';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import { TrimInput } from '@shared/directives';
import {
  CreateModuleOperationReq,
  DEFAULT_MODULE_SCOPE_KEY,
  flattenModuleHeaders,
  MODULE_SCOPES,
  ModuleOperationMutationRes,
  ModuleOperationRow,
  ModuleScopeKey,
  moduleScopeValue,
  UpdateModuleOperationReq,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

export interface ModuleOperationFormData {
  moduleOperation?: ModuleOperationRow;
  /** The scope the grid is filtered to, so a new mapping does not land outside the caller's view. */
  moduleScopeKey?: ModuleScopeKey | null;
}

interface SelectOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-module-operation-form',
  imports: [
    FormsModule,
    FormField,
    IconHelpLink,
    SkeletonField,
    SkeletonToggle,
    ToggleField,
    TrimInput,
    AutoFocusModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './module-operation-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ModuleOperationForm {
  readonly #moduleOperationApi = inject(ModuleOperationApi);
  readonly #menuStructureApi = inject(MenuStructureApi);
  readonly #operationsApi = inject(OperationsMasterApi);
  readonly #parentModuleApi = inject(ParentModuleApi);
  readonly #subModuleApi = inject(SubModuleApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  protected readonly data: ModuleOperationFormData = this.#dialogConfig.data ?? {};
  protected readonly moduleOperationId = this.data.moduleOperation?.id;

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly isLoadingModules = signal(false);
  protected readonly isLoadingOperations = signal(false);
  protected readonly isLoadingMenuStructures = signal(false);

  protected readonly scopeOptions = MODULE_SCOPES;
  protected readonly moduleOptions = signal<SelectOption[]>([]);
  protected readonly operationOptions = signal<SelectOption[]>([]);
  protected readonly menuStructureOptions = signal<SelectOption[]>([]);

  /**
   * Scope only narrows the module dropdown — it is not part of the payload, so it stays outside the
   * signal form (Signal Forms exposes no change stream to react to).
   */
  protected readonly moduleScopeKey = signal<ModuleScopeKey>(
    this.data.moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY,
  );

  protected readonly model = signal({
    moduleId: null as number | null,
    operationId: null as number | null,
    pageURL: '',
    iconURL: '',
    dataViewStructureId: null as number | null,
    pageTypeId: null as number | null,
    priority: null as number | null,
    remark: '',
    isCommonItem: false,
    isOperational: true,
    isActive: true,
  });

  protected readonly f = form(this.model, (p) => {
    required(p.moduleId, { message: 'Module is required' });
    required(p.operationId, { message: 'Operation is required' });
    maxLength(p.pageURL, 255, { message: 'Page URL cannot exceed 255 characters' });
    maxLength(p.iconURL, 255, { message: 'Icon URL cannot exceed 255 characters' });
    maxLength(p.remark, 255, { message: 'Remark cannot exceed 255 characters' });
  });

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  constructor() {
    this.loadModuleOptions();
    this.loadOperationOptions();
    this.loadMenuStructureOptions();

    if (this.moduleOperationId) {
      this.hydrate(this.moduleOperationId);
    }
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  private hydrate(id: number): void {
    this.isLoading.set(true);

    this.#moduleOperationApi
      .getModuleOperation(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const row = res.isSucceeded ? res.data : null;
          if (!row) {
            this.#commonService.showMessage(res.message, 'error');
            return;
          }
          this.model.set({
            moduleId: row.moduleId,
            operationId: row.operationId,
            pageURL: row.pageURL ?? '',
            iconURL: row.iconURL ?? '',
            dataViewStructureId: row.dataViewStructureId,
            pageTypeId: row.pageTypeId,
            priority: row.priority,
            remark: row.remark ?? '',
            isCommonItem: row.isCommonItem ?? false,
            isOperational: row.isOperational ?? false,
            isActive: row.isActive,
          });
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  /**
   * Mappings can target a header or a leaf module, so both lists are merged — `get-module-headers`
   * never returns leaves and `/ChildModule/list` is the only source for them. Both endpoints return
   * nothing without a scope, hence the scope select above them. `handleError` rethrows, so each call
   * swallows its own failure rather than emptying the whole dropdown.
   */
  private loadModuleOptions(): void {
    const moduleScope = moduleScopeValue(this.moduleScopeKey());
    this.isLoadingModules.set(true);

    forkJoin({
      parents: this.#parentModuleApi
        .getModuleHeaders({ ModuleScope: moduleScope, IsActive: true })
        .pipe(catchError(() => of(null))),
      subs: this.#subModuleApi
        .getSubModules({ moduleScope, isActive: true })
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => this.isLoadingModules.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((res) => {
        const parents = res.parents?.isSucceeded
          ? flattenModuleHeaders(res.parents.data ?? [])
          : [];
        // `Common` shares its scope with `Institution User`, so it is narrowed here instead. Only the
        // leaves can be narrowed — the header projection carries no `isCommonMenu`.
        const allSubs = res.subs?.isSucceeded ? (res.subs.data ?? []) : [];
        const subs =
          this.moduleScopeKey() === 'common'
            ? allSubs.filter((module) => module.isCommonMenu)
            : allSubs;

        // Sub-headers come back from both endpoints; the sub-module label wins because it names
        // the parent too.
        const byId = new Map<number, string>(
          parents.map((module) => [module.id, module.displayName]),
        );
        for (const module of subs) {
          byId.set(
            module.id,
            module.parentModule
              ? `${module.parentModule.displayName} › ${module.displayName}`
              : module.displayName,
          );
        }

        this.moduleOptions.set(
          [...byId]
            .map(([value, label]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      });
  }

  private loadOperationOptions(): void {
    this.isLoadingOperations.set(true);

    this.#operationsApi
      .getOperations()
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.isLoadingOperations.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((res) => {
        const operations = res?.isSucceeded ? (res.data ?? []) : [];
        this.operationOptions.set(
          operations
            .filter((operation) => operation.isActive)
            .map((operation) => ({ label: operation.operationName, value: operation.id })),
        );
      });
  }

  private loadMenuStructureOptions(): void {
    this.isLoadingMenuStructures.set(true);

    this.#menuStructureApi
      .getMenuStructures()
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.isLoadingMenuStructures.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((res) => {
        const structures = res?.isSucceeded ? (res.data ?? []) : [];
        this.menuStructureOptions.set(
          structures.map((structure) => ({ label: structure.displayOn, value: structure.id })),
        );
      });
  }

  onScopeChange(moduleScopeKey: ModuleScopeKey | null): void {
    this.moduleScopeKey.set(moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY);
    // The selected module may not exist in the new scope.
    this.model.update((m) => ({ ...m, moduleId: null }));
    this.loadModuleOptions();
  }

  /** Keeps the model in step with the hand-bound remark textarea. */
  onRemarkInput(event: Event): void {
    const remark = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, remark }));
  }

  onSubmit() {
    this.submitted.set(true);

    // Enter submits natively, bypassing the disabled Save button.
    if (this.isSaving()) {
      return;
    }

    submit(this.f, async () => {
      const value = this.model();
      const base: CreateModuleOperationReq = {
        // `required` has already ruled out null; the fallback only narrows the type.
        moduleId: value.moduleId ?? 0,
        operationId: value.operationId ?? 0,
        dataViewStructureId: value.dataViewStructureId,
        pageTypeId: value.pageTypeId,
        pageURL: value.pageURL.trim() || null,
        iconURL: value.iconURL.trim() || null,
        isCommonItem: value.isCommonItem,
        isOperational: value.isOperational,
        priority: value.priority,
        remark: value.remark.trim() || null,
        isActive: value.isActive,
      };

      let request$: Observable<ModuleOperationMutationRes>;

      if (this.moduleOperationId) {
        const body: UpdateModuleOperationReq = {
          ...base,
          id: this.moduleOperationId,
          moduleOperationMappingId: this.data.moduleOperation?.moduleOperationMappingId ?? null,
        };
        request$ = this.#moduleOperationApi.updateModuleOperation(body);
      } else {
        request$ = this.#moduleOperationApi.addModuleOperation(base);
      }

      this.isSaving.set(true);
      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#dialogRef.close(true);
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
