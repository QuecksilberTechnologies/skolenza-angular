import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';

import RegistrationPasswordComponent from './registration-password';

describe('RegistrationPasswordComponent', () => {
  let component: RegistrationPasswordComponent;
  let fixture: ComponentFixture<RegistrationPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationPasswordComponent],
      providers: [provideRouter([]), MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
