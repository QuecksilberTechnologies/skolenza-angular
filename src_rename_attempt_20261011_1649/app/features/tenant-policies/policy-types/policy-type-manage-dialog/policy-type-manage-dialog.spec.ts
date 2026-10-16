import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import PolicyTypeManageDialog from './policy-type-manage-dialog';

describe('PolicyTypeManageDialog', () => {
  let fixture: ComponentFixture<PolicyTypeManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTypeManageDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {} } },
        {
          provide: DynamicDialogConfig,
          useValue: { data: { categories: [{ id: 1, name: 'Leave' }] } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyTypeManageDialog);
  });

  it('renders the create form', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#policyTypeCode')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeTruthy();
  });
});
