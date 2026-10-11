import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import AssetCategory from './asset-category';

describe('AssetCategory', () => {
  let component: AssetCategory;
  let fixture: ComponentFixture<AssetCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetCategory],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        { provide: DialogService, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCategory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
