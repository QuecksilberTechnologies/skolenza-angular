import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RovingRadioGroup } from './roving-radio-group';

@Component({
  imports: [RovingRadioGroup],
  template: `
    <div appRovingRadioGroup role="radiogroup" aria-label="Options">
      @for (option of options; track option) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="selected() === option"
          (click)="selected.set(option)"
        >
          {{ option }}
        </button>
      }
    </div>
  `,
})
class Host {
  readonly options = ['a', 'b', 'c'];
  readonly selected = signal('a');
}

describe('RovingRadioGroup', () => {
  let fixture: ComponentFixture<Host>;

  const root = () => fixture.nativeElement as HTMLElement;

  const radios = () => Array.from(root().querySelectorAll<HTMLButtonElement>('[role="radio"]'));

  const press = (key: string) => {
    root()
      .querySelector('[role="radiogroup"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('keeps a single tab stop on the checked radio', () => {
    expect(radios().map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
  });

  it('moves and selects with ArrowRight, wrapping at the end', () => {
    radios()[0].focus();
    press('ArrowRight');

    expect(fixture.componentInstance.selected()).toBe('b');
    expect(document.activeElement).toBe(radios()[1]);

    press('ArrowRight');
    press('ArrowRight');

    expect(fixture.componentInstance.selected()).toBe('a');
    expect(document.activeElement).toBe(radios()[0]);
  });

  it('moves backwards with ArrowLeft, wrapping at the start', () => {
    radios()[0].focus();
    press('ArrowLeft');

    expect(fixture.componentInstance.selected()).toBe('c');
    expect(document.activeElement).toBe(radios()[2]);
  });

  it('jumps to the first and last radio with Home and End', () => {
    radios()[0].focus();
    press('End');
    expect(fixture.componentInstance.selected()).toBe('c');

    press('Home');
    expect(fixture.componentInstance.selected()).toBe('a');
  });

  it('ignores unrelated keys', () => {
    radios()[0].focus();
    press('Enter');

    expect(fixture.componentInstance.selected()).toBe('a');
  });
});
