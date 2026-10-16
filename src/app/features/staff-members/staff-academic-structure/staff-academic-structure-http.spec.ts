import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { AcademicMasterType } from '@shared/interfaces';

import StaffAcademicStructure from './staff-academic-structure';

describe('Academic structure form HTTP contract', () => {
  let component: StaffAcademicStructure;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        StaffAcademicStructureApi,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new StaffAcademicStructure());
  });

  afterEach(() => http.verify());

  for (const type of Object.values(AcademicMasterType)) {
    it(`creates ${type} without a zero record ID that the API interprets as an update`, () => {
      component.selectedTab.set(type);
      component.masterForm.code = 'AY-2028-29';
      component.masterForm.name = 'Academic Year 2028-29';
      component.saveMaster();

      const request = http.expectOne((req) => req.url.endsWith(`/masters/${type}`));
      expect(request.request.method).toBe('POST');
      expect(JSON.parse(request.request.serializeBody() as string)).not.toHaveProperty('id');
      request.flush({ isSucceeded: true, message: 'Saved', data: { id: 25 } });
      http
        .match((req) => req.method === 'GET')
        .forEach((lookup) => {
          lookup.flush({ isSucceeded: true, message: '', data: [] });
        });
      expect(component.masterForm.id).toBeUndefined();
      expect(TestBed.inject(Common).showMessage).toHaveBeenCalledWith('Saved', 'success');
    });
  }

  it('retains the persisted ID and PUT route while editing an existing record', () => {
    component.edit({
      id: 25,
      code: 'AY-2028-29',
      name: 'Academic Year 2028-29',
      isActive: true,
      type: 1,
    });
    component.saveMaster();

    const request = http.expectOne((req) => req.url.endsWith('/masters/Session/25'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.id).toBe(25);
    request.flush({ isSucceeded: true, message: 'Updated', data: { id: 25 } });
    http
      .match((req) => req.method === 'GET')
      .forEach((lookup) => {
        lookup.flush({ isSucceeded: true, message: '', data: [] });
      });
  });
});
