import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileLoader } from './profile-loader';

describe('ProfileLoader', () => {
  let component: ProfileLoader;
  let fixture: ComponentFixture<ProfileLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileLoader],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
