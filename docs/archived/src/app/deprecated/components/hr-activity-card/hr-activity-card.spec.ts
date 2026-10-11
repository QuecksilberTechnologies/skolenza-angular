import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrActivityCard } from './hr-activity-card';

describe('HrActivityCard', () => {
  let component: HrActivityCard;
  let fixture: ComponentFixture<HrActivityCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrActivityCard],
    }).compileComponents();

    fixture = TestBed.createComponent(HrActivityCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
