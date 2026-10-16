import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { ProfileEmpty } from './profile-empty';

describe('ProfileEmpty', () => {
  let component: ProfileEmpty;
  let fixture: ComponentFixture<ProfileEmpty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileEmpty],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEmpty);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', 'No data');
    fixture.componentRef.setInput('description', 'No records found');
    fixture.componentRef.setInput('tabIcon', 'user');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
