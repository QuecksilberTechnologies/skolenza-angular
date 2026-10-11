import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';

import Subscription from './subscription';

describe('Subscription', () => {
  let component: Subscription;
  let fixture: ComponentFixture<Subscription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Subscription],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        DatePipe,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Subscription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
