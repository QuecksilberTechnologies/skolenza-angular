import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { ModuleOperationRow } from '@shared/interfaces';

/**
 * Read-only module operation summary for the row detail sheet.
 *
 * The grid has no column for the identifiers, the icon, or the audit trail, so this panel is where
 * they stay reachable — it always renders every field.
 *
 * `block h-full` on the host is required: Optimus renders `#headless` content as a direct flex
 * child of the drawer root with no `.p-drawer-content` wrapper, so without it the inner `h-full`
 * has nothing to resolve against and the body never scrolls.
 */
@Component({
  selector: 'app-module-operation-detail',
  imports: [ButtonModule, TagModule, DatePipe],
  templateUrl: './module-operation-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleOperationDetail {
  /** Required because the drawer only renders this component once a row is selected. */
  readonly moduleOperation = input.required<ModuleOperationRow>();
  /** Owned by the caller — this panel stays presentational and reads no permission store. */
  readonly canEdit = input(false);
  readonly closePopup = output<void>();
  readonly editModuleOperation = output<ModuleOperationRow>();

  /** Scoped to the record so a reopened drawer never labels itself from a stale node. */
  protected readonly titleId = computed(
    () => `module-operation-detail-title-${this.moduleOperation().id}`,
  );

  protected readonly moduleLabel = computed(() => {
    const moduleOperation = this.moduleOperation();
    return moduleOperation.moduleName || `#${moduleOperation.moduleId}`;
  });

  protected readonly operationLabel = computed(() => {
    const moduleOperation = this.moduleOperation();
    return moduleOperation.operationName || `#${moduleOperation.operationId}`;
  });

  /** `iconURL` holds a PrimeIcons class, not a URL — only preview strings that actually are one. */
  protected readonly iconPreviewClass = computed(() => {
    const icon = this.moduleOperation().iconURL?.trim() ?? '';
    return /^pi(\s|$)/.test(icon) ? icon : null;
  });

  protected readonly isExternalPageUrl = computed(() =>
    (this.moduleOperation().pageURL ?? '').startsWith('http'),
  );

  protected readonly hasAudit = computed(() => {
    const { addedById, addedDateTime, updatedById, updatedDateTime } = this.moduleOperation();
    return (
      addedById != null || addedDateTime != null || updatedById != null || updatedDateTime != null
    );
  });

  protected onClose() {
    this.closePopup.emit();
  }

  protected onEdit() {
    this.editModuleOperation.emit(this.moduleOperation());
  }
}
