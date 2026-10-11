import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AvatarPopupHeader } from './avatar-popup-header';

describe('AvatarPopupHeader', () => {
  let component: AvatarPopupHeader;
  let fixture: ComponentFixture<AvatarPopupHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarPopupHeader],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarPopupHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('staffMember', { id: 1, staffMemberFullName: 'Test User' });
    fixture.componentRef.setInput('summary', { staffMemberFullName: 'Test User' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
