import { DatePipe } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { MenuItem, MessageService } from '@openng/optimus-ui/api';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';

import { LoginInfo, ToastTypes } from '@shared/interfaces';

import { StorageApi } from './storage-api';

export interface PageHeaderInfo {
  pageTitle: string;
  pageDescription: string;
  pageIcon: string;
  isBreadcrumbShow?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Common {
  readonly #messageService = inject(MessageService);
  readonly #storageApi = inject(StorageApi);
  readonly #datePipe = inject(DatePipe);

  // Private signals
  readonly #pageHeaderInfo = signal<PageHeaderInfo | null>(null);
  readonly #breadcrumbItems = signal<MenuItem[]>([]);

  // Public readonly signals for components
  readonly pageHeaderInfo = this.#pageHeaderInfo.asReadonly();
  readonly breadcrumbItems = this.#breadcrumbItems.asReadonly();

  setPageHeaderInfo(value: PageHeaderInfo) {
    this.#pageHeaderInfo.set(value);
  }

  resetPageHeaderInfo() {
    this.setPageHeaderInfo({
      pageTitle: '',
      pageDescription: '',
      pageIcon: '',
      isBreadcrumbShow: false,
    });
  }

  setBreadcrumbItems(value: MenuItem[]) {
    this.#breadcrumbItems.set(value);
  }

  resetBreadcrumbItems() {
    this.setBreadcrumbItems([]);
  }

  async getLoginInfo() {
    return (await this.#storageApi.getItem('loginInfo')) as LoginInfo;
  }

  getPaginationParam(event: TableLazyLoadEvent) {
    const rows = event.rows ?? 10;
    const page = Math.floor((event.first ?? 0) / rows);
    const sortField = event.sortField;
    const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
    return { page: page + 1, rows, sortField, sortOrder };
  }

  getFormattedDate(date: string, format: string): string {
    const formattedDate = this.#datePipe.transform(date, format);
    return formattedDate || '';
  }

  showMessage(message: string, type: ToastTypes, key?: string) {
    this.#messageService?.clear();
    this.#messageService?.add({
      severity: type,
      detail: message,
      summary: type.toLocaleUpperCase(),
      key: key ?? 'globalToaster',
    });
  }
}
