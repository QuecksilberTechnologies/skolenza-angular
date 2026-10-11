import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComingSoonOverlay } from './coming-soon-overlay';

describe('ComingSoonOverlay', () => {
  let component: ComingSoonOverlay;
  let fixture: ComponentFixture<ComingSoonOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComingSoonOverlay],
    }).compileComponents();

    fixture = TestBed.createComponent(ComingSoonOverlay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
