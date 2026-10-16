import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { AssetStatusManageDialog } from './asset-status-manage-dialog';

describe('AssetStatusManageDialog', () => {
  let component: AssetStatusManageDialog;
  let fixture: ComponentFixture<AssetStatusManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetStatusManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetStatusManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
