import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostApi } from '@core/services';

import { HostUserManageDialog } from './host-user-manage-dialog';

describe('HostUserManageDialog', () => {
  const hostApiMock = { getHostRoles: vi.fn() };

  const createFixture = (): ComponentFixture<HostUserManageDialog> => {
    const fixture = TestBed.createComponent(HostUserManageDialog);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    hostApiMock.getHostRoles.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    await TestBed.configureTestingModule({
      imports: [HostUserManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: HostApi, useValue: hostApiMock },
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('still renders when the role lookup fails', async () => {
    // The role select reads `hostRolesResource.value()` straight from the template; an
    // errored resource makes that throw and freezes the whole dialog.
    hostApiMock.getHostRoles.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = createFixture();
    await fixture.whenStable();

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
