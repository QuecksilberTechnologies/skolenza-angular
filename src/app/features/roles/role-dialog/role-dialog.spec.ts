import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { vi } from 'vitest';

import { RolesApi } from '@core/services';

import { RoleDialog } from './role-dialog';

describe('RoleDialog', () => {
  let component: RoleDialog;
  let fixture: ComponentFixture<RoleDialog>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleDialog);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Role/type-options'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({
      isSucceeded: true,
      message: 'Role options fetched successfully.',
      errors: [],
      data: [
        { id: 1, name: 'Admin', description: 'Admin access' },
        { id: 2, name: 'StaffMember', description: 'StaffMember access' },
        { id: 3, name: 'Manager', description: 'Manager access' },
        { id: 4, name: 'Client', description: '' },
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with no role type selected and require one', () => {
    const roleType = component['roleForm'].controls.roleType;

    expect(roleType.value).toBeNull();
    expect(roleType.hasError('required')).toBe(true);
    expect(component['roleForm'].invalid).toBe(true);
  });

  it('should be valid once a name and role type are provided', () => {
    component['roleForm'].patchValue({ roleName: 'External Client', roleType: 4 });

    expect(component['roleForm'].valid).toBe(true);
  });

  it('should expose Client from the API-backed role type options', () => {
    expect(component['roleTypes']().find((type) => type.id === 4)?.name).toBe('Client');
  });

  it('should preserve Client when an existing role is patched for editing', () => {
    component['role'] = {
      id: 10,
      roleName: 'Client',
      roleType: 4,
      roleTypeName: 'Client',
      remark: '',
      isActive: true,
    };

    component.patchForm();

    expect(component['roleForm'].controls.roleType.value).toBe(4);
  });

  it('returns the saved server identity without inserting a guessed role into the list', () => {
    const api = TestBed.inject(RolesApi);
    const close = vi.spyOn(TestBed.inject(DynamicDialogRef), 'close');
    component['roleForm'].patchValue({ roleName: 'Teaching Staff', roleType: 2 });
    component.onSubmit();
    const savedRole = {
      id: 501,
      roleName: 'Teaching Staff',
      roleType: 2,
      roleTypeName: 'Staff Member',
      isActive: true,
    };
    httpMock
      .expectOne((req) => req.method === 'POST' && req.url.includes('/Role/'))
      .flush({
        isSucceeded: true,
        message: 'Role created successfully.',
        data: [savedRole],
      });
    expect(close).toHaveBeenCalledWith([savedRole]);
    expect(api.roles()).toEqual([]);
    expect(api.totalRecords()).toBe(0);
  });
});
