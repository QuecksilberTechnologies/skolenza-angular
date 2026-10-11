import { ComponentFixture, TestBed } from '@angular/core/testing';

import AsideMenuLoader from './aside-menu-loader';

describe('AsideMenuLoader', () => {
  let component: AsideMenuLoader;
  let fixture: ComponentFixture<AsideMenuLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsideMenuLoader],
    }).compileComponents();

    fixture = TestBed.createComponent(AsideMenuLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
