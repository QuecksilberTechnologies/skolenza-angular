import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import StaffMemberFilesInfo from './staff-member-files-info';

describe('StaffMemberFilesInfo', () => {
  let component: StaffMemberFilesInfo;
  let fixture: ComponentFixture<StaffMemberFilesInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberFilesInfo],
      providers: [MessageService, DatePipe, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberFilesInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
