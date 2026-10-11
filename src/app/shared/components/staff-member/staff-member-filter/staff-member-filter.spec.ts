import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import StaffMemberFilter from './staff-member-filter';

describe('StaffMemberFilter', () => {
  let component: StaffMemberFilter;
  let fixture: ComponentFixture<StaffMemberFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberFilter],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
