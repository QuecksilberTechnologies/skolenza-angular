import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AvatarPopupItem } from './avatar-popup-item';

describe('AvatarPopupItem', () => {
  let component: AvatarPopupItem;
  let fixture: ComponentFixture<AvatarPopupItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarPopupItem],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarPopupItem);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.componentRef.setInput('icon', [] as unknown);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
