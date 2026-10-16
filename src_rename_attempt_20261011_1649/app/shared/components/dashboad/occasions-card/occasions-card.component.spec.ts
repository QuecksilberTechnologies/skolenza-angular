import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OccasionsCardComponent } from './occasions-card.component';

describe('OccasionsCardComponent', () => {
  let component: OccasionsCardComponent;
  let fixture: ComponentFixture<OccasionsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OccasionsCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OccasionsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
