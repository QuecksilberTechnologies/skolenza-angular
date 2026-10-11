import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { PolicyTypeMapDetail } from './policy-type-map-detail';

describe('PolicyTypeMapDetail', () => {
  let component: PolicyTypeMapDetail;
  let fixture: ComponentFixture<PolicyTypeMapDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTypeMapDetail],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyTypeMapDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
