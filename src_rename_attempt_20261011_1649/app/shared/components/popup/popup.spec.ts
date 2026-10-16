import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Popup } from './popup';

describe('Popup', () => {
  let component: Popup;
  let fixture: ComponentFixture<Popup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Popup],
    }).compileComponents();

    fixture = TestBed.createComponent(Popup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose a hide method', () => {
    expect(typeof component.hide).toBe('function');
  });

  it('should emit closed when hide is called', () => {
    let count = 0;
    component.closed.subscribe(() => count++);
    component.hide();
    expect(count).toBe(1);
  });

  const contentWrapper = () => (fixture.nativeElement as HTMLElement).querySelector('div')!;

  it('should scroll and cap the content height at 70vh by default', () => {
    expect(contentWrapper().classList).toContain('max-h-[70vh]');
    expect(contentWrapper().classList).toContain('overflow-y-auto');
  });

  it('should apply a custom contentClass', () => {
    fixture.componentRef.setInput('contentClass', 'min-h-0 flex-1 overflow-hidden');
    fixture.detectChanges();

    expect(contentWrapper().classList).toContain('flex-1');
    expect(contentWrapper().classList).not.toContain('max-h-[70vh]');
    expect(contentWrapper().classList).not.toContain('overflow-y-auto');
  });
});
