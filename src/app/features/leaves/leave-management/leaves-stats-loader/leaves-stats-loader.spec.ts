import { ComponentFixture, TestBed } from '@angular/core/testing';

import LeavesStatsLoader from './leaves-stats-loader';

describe('LeavesStatsLoader', () => {
  let component: LeavesStatsLoader;
  let fixture: ComponentFixture<LeavesStatsLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeavesStatsLoader],
    }).compileComponents();

    fixture = TestBed.createComponent(LeavesStatsLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
