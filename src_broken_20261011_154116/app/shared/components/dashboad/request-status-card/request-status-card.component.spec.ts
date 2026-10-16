import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestStatusCardComponent } from './request-status-card.component';

describe('RequestStatusCardComponent', () => {
  let component: RequestStatusCardComponent;
  let fixture: ComponentFixture<RequestStatusCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestStatusCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestStatusCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
