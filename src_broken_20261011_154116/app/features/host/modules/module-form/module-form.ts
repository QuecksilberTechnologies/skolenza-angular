import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize, map, Observable } from 'rxjs';

import { Common, ParentModuleApi, SubModuleApi } from '@core/services';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { IconHelpLink } from '@shared/components/icon-help-link/icon-help-link';
import {
  CreateParentModuleReq,
  CreateSubModuleReq,
  DEFAULT_MODULE_SCOPE_KEY,
  flattenModuleHeaders,
  MODULE_SCOPES,
  ModuleMutationRes,
  ModuleParentRef,
  ModuleRow,
  ModuleScopeKey,
  moduleScopeKeyOf,
  moduleScopeValue,
  SubModuleRow,
} from '@shared/interfaces';

export type ModuleFormKind = 'parent' | 'sub';

/** Seeded into new modules so every menu entry ships with an icon; edits keep the saved value. */
const DEFAULT_ICONS = { web: 'pi pi-box', mobile: 'box-outline' } as const;

/** The only fields the parent select binds — lets the row's own parent ref stand in as an option. */
type ParentOption = Pick<ModuleRow, 'id' | 'displayName' | 'moduleName'>;

export interface ModuleFormData {
  kind: ModuleFormKind;
  module?: ModuleRow;
  /** Seeds the scope and parent selects when the grid already has them filtered. */
  moduleScopeKey?: ModuleScopeKey | null;
  parentModuleId?: number | null;
}

@Component({
  selector: 'app-module-form',
  imports: [
    FormField,
    IconHelpLink,
    SkeletonField,
    SkeletonToggle,
    AutoFocusModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './module-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ModuleForm {
  readonly #parentModuleApi = inject(ParentModuleApi);
  readonly #subModuleApi = inject(SubModuleApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  protected readonly data: ModuleFormData = this.#dialogConfig.data ?? { kind: 'parent' };
  protected readonly isSubModule = this.data.kind === 'sub';
  protected readonly moduleId = this.data.module?.id;

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  readonly #loadedParents = signal<ParentOption[]>([]);
  readonly #rowParent = signal<ModuleParentRef | null>(
    (this.data.module as SubModuleRow | undefined)?.parentModule ?? null,
  );
  protected readonly isLoadingParents = signal(false);

  /**
   * The row's own parent can sit outside the loaded list — `get-module-headers` is filtered to
   * `IsActive: true` — which would otherwise leave the select on its placeholder.
   */
  protected readonly parentOptions = computed<ParentOption[]>(() => {
    const options = this.#loadedParents();
    const current = this.model().parentModuleId;
    const parent = this.#rowParent();

    return current && parent?.id === current && !options.some((o) => o.id === current)
      ? [parent, ...options]
      : options;
  });

  protected readonly scopeOptions = MODULE_SCOPES;

  protected readonly model = signal({
    parentModuleId: null as number | null,
    moduleCode: '',
    moduleName: '',
    displayName: '',
    urlPath: '',
    moduleScopeKey: null as ModuleScopeKey | null,
    itemPriority: null as number | null,
    imageIconWeb: '',
    imageIconMobile: '',
    remark: '',
    isModuleDisplayInUI: true,
    isCommonMenu: false,
    isActive: true,
  });

  protected readonly f = form(this.model, (p) => {
    // `parentModuleId` is only part of the sub-module payload, so the rule is conditional.
    if (this.isSubModule) {
      required(p.parentModuleId, { message: 'Parent header is required' });
    }
    required(p.moduleCode, { message: 'Code is required' });
    maxLength(p.moduleCode, 50, { message: 'Code cannot exceed 50 characters' });
    disabled(p.moduleCode, { when: () => !!this.moduleId });
    required(p.moduleName, { message: 'System name is required' });
    maxLength(p.moduleName, 100, { message: 'System name cannot exceed 100 characters' });
    required(p.displayName, { message: 'Name is required' });
    maxLength(p.displayName, 100, { message: 'Name cannot exceed 100 characters' });
    required(p.urlPath, { message: 'Route is required' });
    maxLength(p.urlPath, 500, { message: 'Route cannot exceed 500 characters' });
    required(p.moduleScopeKey, { message: 'Scope is required' });
    maxLength(p.imageIconWeb, 255, { message: 'Web icon cannot exceed 255 characters' });
    maxLength(p.imageIconMobile, 255, { message: 'Mobile icon cannot exceed 255 characters' });
    maxLength(p.remark, 200, { message: 'Remark cannot exceed 200 characters' });
  });

  constructor() {
    this.model.update((m) => ({
      ...m,
      moduleScopeKey: this.data.moduleScopeKey ?? null,
      parentModuleId: this.data.parentModuleId ?? null,
      // Only creates get seeded — `patchModel` owns the values on edit.
      imageIconWeb: this.moduleId ? m.imageIconWeb : DEFAULT_ICONS.web,
      imageIconMobile: this.moduleId ? m.imageIconMobile : DEFAULT_ICONS.mobile,
    }));

    // Edits load the options from `hydrate()` instead, once the server row's scope is known.
    if (this.isSubModule && !this.moduleId) {
      this.loadParentOptions();
    }

    if (this.moduleId) {
      this.hydrate(this.moduleId);
    }
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  private hydrate(id: number): void {
    this.isLoading.set(true);
    const request$ = this.isSubModule
      ? this.#subModuleApi.getSubModule(id, this.data.module?.moduleScope)
      : this.#parentModuleApi.getParentModule(id, this.data.module?.moduleScope);

    request$
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
          this.patchModel(row);
          this.#rowParent.set((row as SubModuleRow).parentModule ?? this.#rowParent());

          if (this.isSubModule) {
            this.loadParentOptions();
          }
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  private patchModel(row: ModuleRow): void {
    this.model.set({
      parentModuleId: row.parentModuleId,
      moduleCode: row.moduleCode ?? '',
      moduleName: row.moduleName ?? '',
      displayName: row.displayName ?? '',
      urlPath: row.urlPath ?? '',
      moduleScopeKey: moduleScopeKeyOf(row),
      itemPriority: row.itemPriority,
      imageIconWeb: row.imageIconWeb ?? '',
      imageIconMobile: row.imageIconMobile ?? '',
      remark: row.remark ?? '',
      isModuleDisplayInUI: row.isModuleDisplayInUI,
      isCommonMenu: row.isCommonMenu,
      isActive: row.isActive,
    });
  }

  /**
   * `get-module-headers` already returns exactly the modules allowed to own children — top-level
   * headers plus their non-leaf sub-headers — so the tree is flattened straight into the select.
   * `handleError` rethrows, so a 4xx reaches the subscribe's error handler and is reported rather
   * than leaving the dropdown silently empty.
   */
  private loadParentOptions(): void {
    this.isLoadingParents.set(true);

    this.#parentModuleApi
      .getModuleHeaders({
        // The endpoint returns nothing without a scope.
        ModuleScope: moduleScopeValue(this.model().moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY),
        IsActive: true,
      })
      .pipe(
        map((res) => {
          // A refused envelope must speak up — swallowing it left an empty dropdown and no toast.
          if (!res.isSucceeded) {
            throw new Error(res.message || 'Could not load parent headers.');
          }
          return flattenModuleHeaders(res.data ?? []);
        }),
        finalize(() => this.isLoadingParents.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (options) => this.#loadedParents.set(options),
        error: (err) => {
          this.#loadedParents.set([]);
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  /** Keeps the model in step with the hand-bound remark textarea. */
  onRemarkInput(event: Event): void {
    const remark = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, remark }));
  }

  onSubmit() {
    // Enter submits natively, bypassing the disabled Save button.
    if (this.isSaving()) {
      return;
    }

    submit(this.f, async () => {
      const value = this.model();
      const base: CreateParentModuleReq = {
        moduleCode: value.moduleCode.trim(),
        moduleName: value.moduleName.trim(),
        displayName: value.displayName.trim(),
        urlPath: value.urlPath.trim(),
        isModuleDisplayInUI: value.isModuleDisplayInUI,
        isCommonMenu: value.isCommonMenu || value.moduleScopeKey === 'common',
        // `required` has already ruled out null; the fallback only narrows the type.
        moduleScope: moduleScopeValue(value.moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY),
        isActive: value.isActive,
        imageIconWeb: value.imageIconWeb.trim() || null,
        imageIconMobile: value.imageIconMobile.trim() || null,
        itemPriority: value.itemPriority,
        remark: value.remark.trim() || null,
      };

      let request$: Observable<ModuleMutationRes>;

      if (this.isSubModule) {
        const body: CreateSubModuleReq = { ...base, parentModuleId: value.parentModuleId ?? 0 };
        request$ = this.moduleId
          ? this.#subModuleApi.updateSubModule(this.moduleId, body)
          : this.#subModuleApi.addSubModule(body);
      } else {
        request$ = this.moduleId
          ? this.#parentModuleApi.updateParentModule(this.moduleId, base)
          : this.#parentModuleApi.addParentModule(base);
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
