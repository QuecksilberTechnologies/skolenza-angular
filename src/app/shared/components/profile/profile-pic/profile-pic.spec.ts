import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { ProfilePic } from './profile-pic';

describe('ProfilePic', () => {
  let component: ProfilePic;
  let fixture: ComponentFixture<ProfilePic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePic],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePic);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('staffMemberName', 'Test User');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
