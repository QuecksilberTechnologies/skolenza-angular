import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  Country,
  District,
  GetCountriesReq,
  GetCountriesRes,
  GetDistrictsReq,
  GetDistrictsRes,
  GetLocalitiesReq,
  GetLocalitiesRes,
  GetStatesReq,
  GetStatesRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class LocationsApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Location`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #countries = signal<Country[]>([]);
  readonly #isLoadingCountries = signal(false);

  readonly #districts = signal<District[]>([]);
  readonly #isLoadingDistricts = signal(false);

  // Public readonly signals for components
  readonly countries = this.#countries.asReadonly();
  readonly isLoadingCountries = this.#isLoadingCountries.asReadonly();

  readonly districts = this.#districts.asReadonly();
  readonly isLoadingDistricts = this.#isLoadingDistricts.asReadonly();

  constructor() {
    super();
  }

  setCountries(data: Country[]) {
    this.#countries.set(data);
  }

  setIsLoadingCountries(value: boolean) {
    this.#isLoadingCountries.set(value);
  }

  setDistricts(data: District[]) {
    this.#districts.set(data);
  }

  setIsLoadingDistricts(value: boolean) {
    this.#isLoadingDistricts.set(value);
  }

  getCountries(req?: GetCountriesReq): Observable<GetCountriesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetCountriesRes>(`${this.#apiUrl}/country/option`, { params })
      .pipe(catchError(this.handleError<GetCountriesRes>('getCountries')));
  }

  getStates(req?: GetStatesReq): Observable<GetStatesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStatesRes>(`${this.#apiUrl}/State/option`, { params })
      .pipe(catchError(this.handleError<GetStatesRes>('getStates')));
  }

  getDistricts(req?: GetDistrictsReq): Observable<GetDistrictsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetDistrictsRes>(`${this.#apiUrl}/district/option`, { params })
      .pipe(catchError(this.handleError<GetDistrictsRes>('getDistricts')));
  }

  /** Cities, towns and villages inside a district — the level below `getDistricts`. */
  getLocalities(req: GetLocalitiesReq): Observable<GetLocalitiesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetLocalitiesRes>(`${this.#apiUrl}/Locality/option`, { params })
      .pipe(catchError(this.handleError<GetLocalitiesRes>('getLocalities')));
  }
}
