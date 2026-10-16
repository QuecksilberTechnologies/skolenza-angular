import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSummaryBlockShimmer } from './profile-summary-block-shimmer';

describe('ProfileSummaryBlockShimmer', () => {
  let component: ProfileSummaryBlockShimmer;
  let fixture: ComponentFixture<ProfileSummaryBlockShimmer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSummaryBlockShimmer],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileSummaryBlockShimmer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
