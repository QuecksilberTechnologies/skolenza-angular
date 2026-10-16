import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnniversaryCardComponent } from './anniversary-card.component';

describe('AnniversaryCardComponent', () => {
  let component: AnniversaryCardComponent;
  let fixture: ComponentFixture<AnniversaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnniversaryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnniversaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
