import { ComponentFixture, TestBed } from '@angular/core/testing';

import LeavesStats from './leaves-stats';

describe('LeavesStats', () => {
  let component: LeavesStats;
  let fixture: ComponentFixture<LeavesStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeavesStats],
    }).compileComponents();

    fixture = TestBed.createComponent(LeavesStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
