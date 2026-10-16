import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import DesignationManageDialog from './designation-manage-dialog';

describe('DesignationManageDialog', () => {
  let component: DesignationManageDialog;
  let fixture: ComponentFixture<DesignationManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignationManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        {
          provide: DynamicDialogConfig,
          useValue: { data: { departments: [{ id: 1, departmentName: 'HR' }] } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DesignationManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with no department selected and require one', () => {
    const departmentId = component['designationForm'].controls.departmentId;

    expect(departmentId.value).toBeNull();
    expect(departmentId.hasError('required')).toBe(true);
    expect(component['designationForm'].invalid).toBe(true);
  });

  it('should be valid once a name and department are provided', () => {
    component['designationForm'].patchValue({ designationName: 'Manager', departmentId: 1 });

    expect(component['designationForm'].valid).toBe(true);
  });
});
