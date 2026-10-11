import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { SettledSearchTerm, InstitutionDeviceRow } from '@shared/interfaces';

import { MoveDeviceDialog } from './move-device-dialog/move-device-dialog';
import { InstitutionDevicesStore } from './institution-devices.store';

@Component({
  selector: 'app-institution-devices',
  imports: [
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [InstitutionDevicesStore],
  templateUrl: './institution-devices.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionDevices {
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  /** `/InstitutionDevice/update-location` needs the institution explicitly, same as the list read. */
  readonly #institutionId = signal<string | null>(null);

  readonly store = inject(InstitutionDevicesStore);

  constructor() {
    // `/InstitutionDevice/get-all` requires the institution explicitly; wait for the persisted session
    // before the store can make its first request.
    this.#commonService.getLoginInfo().then((loginInfo) => {
      this.#institutionId.set(loginInfo?.user?.institutionId ?? null);
      this.store.setInstitutionId(loginInfo?.user?.institutionId ?? null);
    });

    this.#commonService.setPageHeaderInfo({
      pageTitle: 'My Devices',
      pageDescription: 'Devices assigned to your locations',
      pageIcon: 'pi pi-sitemap',
      isBreadcrumbShow: false,
    });
  }

  searchInstitutionDevices(value: SettledSearchTerm): void {
    this.store.setSearch(value);
  }

  loadInstitutionDevices(event: TableLazyLoadEvent): void {
    this.store.loadPage(event);
  }

  openDeviceSettings(row: InstitutionDeviceRow): void {
    this.#router.navigate(['/app/my-devices', row.id, 'device-settings']);
  }

  moveDevice(row: InstitutionDeviceRow): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(MoveDeviceDialog, {
      header: 'Move Device',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { device: row, institutionId: this.#institutionId() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((moved) => {
      if (moved) {
        this.store.reloadInstitutionDevices();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
