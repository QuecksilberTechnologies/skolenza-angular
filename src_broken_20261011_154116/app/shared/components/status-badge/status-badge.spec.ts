import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadge] }).compileComponents();
    fixture = TestBed.createComponent(StatusBadge);
    host = fixture.nativeElement;
    fixture.componentRef.setInput('label', 'Verified');
  });

  it('renders the label with the tone colours and keeps its base classes', async () => {
    fixture.componentRef.setInput('tone', 'success');
    await fixture.whenStable();

    expect(host.textContent?.trim()).toBe('Verified');
    expect(host.classList).toContain('text-green-700');
    expect(host.classList).toContain('rounded-full');
  });

  it('renders a decorative icon only when one is given', async () => {
    await fixture.whenStable();
    expect(host.querySelector('i')).toBeNull();
    expect(host.classList).toContain('bg-zinc-100');

    fixture.componentRef.setInput('icon', 'pi-clock');
    await fixture.whenStable();
    const icon = host.querySelector('i');
    expect(icon?.classList).toContain('pi-clock');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
