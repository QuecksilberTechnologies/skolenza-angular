import { ComponentFixture, TestBed } from '@angular/core/testing';

import AuthHeaderLogoComponent from './auth-header-logo';

describe('AuthHeaderLogoComponent', () => {
  let component: AuthHeaderLogoComponent;
  let fixture: ComponentFixture<AuthHeaderLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthHeaderLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthHeaderLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
