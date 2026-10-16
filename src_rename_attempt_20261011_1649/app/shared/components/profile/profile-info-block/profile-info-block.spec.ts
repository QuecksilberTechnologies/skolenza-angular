import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileInfoBlock } from './profile-info-block';

describe('ProfileInfoBlock', () => {
  let component: ProfileInfoBlock;
  let fixture: ComponentFixture<ProfileInfoBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileInfoBlock],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileInfoBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a masked value without animating before the first toggle', async () => {
    fixture.componentRef.setInput('isMask', true);
    fixture.componentRef.setInput('value', '68********');
    await TestBed.inject(ApplicationRef).whenStable();

    const visual = fixture.nativeElement.querySelector('.tabular-nums > .min-w-full');
    expect(visual.textContent).toBe('68********');
    expect(fixture.nativeElement.querySelector('.sr-only').textContent).toBe('68********');
  });

  it('labels the toggle by the action it performs', async () => {
    fixture.componentRef.setInput('label', 'Account Number');
    fixture.componentRef.setInput('isMask', true);
    fixture.componentRef.setInput('value', '68********');
    fixture.componentRef.setInput('isMasked', false);
    await TestBed.inject(ApplicationRef).whenStable();
    const button = () => fixture.nativeElement.querySelector('button');
    expect(button().getAttribute('aria-label')).toBe('Show Account Number');

    fixture.componentRef.setInput('isMasked', true);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(button().getAttribute('aria-label')).toBe('Hide Account Number');
  });

  it('shows the logo before the value only when there is a value', async () => {
    fixture.componentRef.setInput('logoSrc', 'https://example.com/hdfc.svg');
    await TestBed.inject(ApplicationRef).whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();

    fixture.componentRef.setInput('value', 'HDFC Bank');
    await TestBed.inject(ApplicationRef).whenStable();
    const logo = fixture.nativeElement.querySelector('img');
    expect(logo.getAttribute('src')).toBe('https://example.com/hdfc.svg');
    expect(logo.getAttribute('alt')).toBe('');
  });
});
