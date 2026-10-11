import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCard } from './dashboard-card';

describe('DashboardCard', () => {
  let component: DashboardCard;
  let fixture: ComponentFixture<DashboardCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCard],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the title', () => {
    fixture.componentRef.setInput('title', 'My Card');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My Card');
  });

  it('should hide action buttons when showActions is false', () => {
    fixture.componentRef.setInput('showActions', false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('p-button')).toBeNull();
  });
});
