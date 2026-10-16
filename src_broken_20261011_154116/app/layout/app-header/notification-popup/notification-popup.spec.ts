import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import NotificationPopupComponent from './notification-popup';

describe('NotificationPopupComponent', () => {
  let component: NotificationPopupComponent;
  let fixture: ComponentFixture<NotificationPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationPopupComponent],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
