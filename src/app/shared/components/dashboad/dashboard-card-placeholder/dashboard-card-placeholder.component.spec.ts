import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCardPlaceholderComponent } from './dashboard-card-placeholder.component';

describe('DashboardCardPlaceholderComponent', () => {
  let component: DashboardCardPlaceholderComponent;
  let fixture: ComponentFixture<DashboardCardPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCardPlaceholderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCardPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
