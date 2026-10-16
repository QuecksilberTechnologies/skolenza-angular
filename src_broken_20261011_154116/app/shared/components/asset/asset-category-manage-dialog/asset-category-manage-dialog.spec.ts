import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { AssetCategoryManageDialog } from './asset-category-manage-dialog';

describe('AssetCategoryManageDialog', () => {
  let component: AssetCategoryManageDialog;
  let fixture: ComponentFixture<AssetCategoryManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetCategoryManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCategoryManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
