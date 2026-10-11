import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AssetStatistic,
  AssetStatisticRequest,
  DashboardStatistic,
  DashboardStatisticRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class DashboardApi extends BaseService {
  readonly #http = inject(HttpClient);

  readonly #apiDashboardUrl = `${environment.apiUrl}/StatData/Manager/Statistics`;
  readonly #apiAssetUrl = `${environment.apiUrl}/StatData/Manager/Statistic`;

  // Private signals
  readonly #assetStatistics = signal<AssetStatistic | null>(null);
  readonly #isLoadingAssetStats = signal(false);

  // Public readonly signals for components
  readonly assetStatistics = this.#assetStatistics.asReadonly();
  readonly isLoadingAssetStats = this.#isLoadingAssetStats.asReadonly();

  constructor() {
    super();
  }

  setAssetStatsLoading(flag: boolean) {
    this.#isLoadingAssetStats.set(flag);
  }

  setAssetStatistics(data: AssetStatistic) {
    this.#assetStatistics.set(data);
  }

  getDashboardStatistics(req: DashboardStatisticRequest): Observable<DashboardStatistic> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<DashboardStatistic>(`${this.#apiDashboardUrl}/Dashboard/get`, { params })
      .pipe(catchError(this.handleError<DashboardStatistic>('getDashboardStatistics')));
  }

  getAssetStatistics(req: AssetStatisticRequest): Observable<AssetStatistic> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<AssetStatistic>(`${this.#apiAssetUrl}/Asset`, { params })
      .pipe(catchError(this.handleError<AssetStatistic>('getAssetStatistics')));
  }
}
