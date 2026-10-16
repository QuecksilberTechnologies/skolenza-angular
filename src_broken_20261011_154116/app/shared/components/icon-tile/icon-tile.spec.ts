import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconTile } from './icon-tile';

describe('IconTile', () => {
  let fixture: ComponentFixture<IconTile>;

  function iconClasses(): string {
    return fixture.nativeElement.querySelector('i').className;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IconTile] }).compileComponents();
    fixture = TestBed.createComponent(IconTile);
  });

  it('renders a PrimeIcons class as given', () => {
    fixture.componentRef.setInput('icon', ' pi pi-users ');
    fixture.detectChanges();

    expect(iconClasses()).toBe('pi pi-users');
  });

  it('falls back for a value that is not a PrimeIcons class', () => {
    fixture.componentRef.setInput('icon', '/assets/module.svg');
    fixture.detectChanges();

    expect(iconClasses()).toBe('pi pi-folder');
  });

  it('falls back for an empty field, and honours a caller-supplied fallback', () => {
    fixture.componentRef.setInput('icon', null);
    fixture.componentRef.setInput('fallback', 'pi pi-bolt');
    fixture.detectChanges();

    expect(iconClasses()).toBe('pi pi-bolt');
  });
});
