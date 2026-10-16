import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileInfoCard } from './profile-info-card';

describe('ProfileInfoCard', () => {
  let component: ProfileInfoCard;
  let fixture: ComponentFixture<ProfileInfoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileInfoCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileInfoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
