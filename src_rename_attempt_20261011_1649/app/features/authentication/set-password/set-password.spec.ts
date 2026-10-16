import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import SetPassword from './set-password';

describe('SetPassword', () => {
  let component: SetPassword;
  let fixture: ComponentFixture<SetPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetPassword],
      providers: [
        MessageService,
        DatePipe,
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
