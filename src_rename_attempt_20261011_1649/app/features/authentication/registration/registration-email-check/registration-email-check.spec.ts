import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { Observable, of } from 'rxjs';

import RegistrationEmailCheckComponent from './registration-email-check';

async function createFixture(
  queryParams: Observable<Record<string, string>>,
): Promise<ComponentFixture<RegistrationEmailCheckComponent>> {
  await TestBed.configureTestingModule({
    imports: [RegistrationEmailCheckComponent],
    providers: [
      MessageService,
      { provide: ActivatedRoute, useValue: { params: of({}), queryParams } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RegistrationEmailCheckComponent);
  fixture.detectChanges();
  return fixture;
}

describe('RegistrationEmailCheckComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    const fixture = await createFixture(of({}));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the address from the query param', async () => {
    const fixture = await createFixture(of({ email: 'user@example.com', emailSent: 'true' }));
    expect(fixture.nativeElement.textContent).toContain('user@example.com');
  });

  it('falls back to a stand-in when no address was passed', async () => {
    const fixture = await createFixture(of({}));
    expect(fixture.nativeElement.textContent).toContain('your email address');
  });

  it('says nothing in the error colour', async () => {
    const fixture = await createFixture(of({ email: 'user@example.com', emailSent: 'true' }));
    expect(fixture.nativeElement.querySelector('[class*="text-red-"]')).toBeNull();
  });

  it('shows the success state when the emailSent param is missing', async () => {
    const fixture = await createFixture(of({ email: 'user@example.com' }));
    expect(fixture.nativeElement.textContent).toContain('Check your email');
    expect(fixture.nativeElement.querySelector('[class*="text-red-"]')).toBeNull();
  });

  it('shows a truthful failure when registration succeeded but mail did not send', async () => {
    const fixture = await createFixture(of({ email: 'user@example.com', emailSent: 'false' }));
    expect(fixture.nativeElement.textContent).toContain('Email could not be sent');
    expect(fixture.nativeElement.textContent).toContain('verification email could not be sent');
    expect(fixture.nativeElement.querySelector('[class*="text-red-"]')).not.toBeNull();
  });
});
