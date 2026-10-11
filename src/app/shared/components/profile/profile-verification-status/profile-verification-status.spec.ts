import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileVerificationStatus } from './profile-verification-status';

describe('ProfileVerificationStatus', () => {
  let component: ProfileVerificationStatus;
  let fixture: ComponentFixture<ProfileVerificationStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileVerificationStatus],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileVerificationStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
