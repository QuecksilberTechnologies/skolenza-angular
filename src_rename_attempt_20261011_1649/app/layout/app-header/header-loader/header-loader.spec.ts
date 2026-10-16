import { ComponentFixture, TestBed } from '@angular/core/testing';

import HeaderLoader from './header-loader';

describe('HeaderLoader', () => {
  let component: HeaderLoader;
  let fixture: ComponentFixture<HeaderLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderLoader],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
