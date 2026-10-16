import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSummaryBlock } from './profile-summary-block';

describe('ProfileSummaryBlock', () => {
  let component: ProfileSummaryBlock;
  let fixture: ComponentFixture<ProfileSummaryBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSummaryBlock],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileSummaryBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
