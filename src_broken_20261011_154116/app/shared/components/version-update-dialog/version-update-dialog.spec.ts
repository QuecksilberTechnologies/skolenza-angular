import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import VersionUpdateDialogComponent from './version-update-dialog';

describe('VersionUpdateDialogComponent', () => {
  let component: VersionUpdateDialogComponent;
  let fixture: ComponentFixture<VersionUpdateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionUpdateDialogComponent],
      providers: [
        MessageService,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VersionUpdateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
