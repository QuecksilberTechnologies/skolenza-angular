import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';

import RegistrationVerifyComponent from './registration-verify';

describe('RegistrationVerifyComponent', () => {
  let component: RegistrationVerifyComponent;
  let fixture: ComponentFixture<RegistrationVerifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationVerifyComponent],
      providers: [provideRouter([]), MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationVerifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
