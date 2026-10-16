import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableSearchInput } from './table-search-input';

describe('TableSearchInput', () => {
  let fixture: ComponentFixture<TableSearchInput>;
  let input: HTMLInputElement;
  let emitted: string[];

  /** One keystroke, then the effects it schedules — as the browser's next task would run them. */
  function type(value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
  }

  async function pressEnter() {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await wait(0);
  }

  /** Runs the clock, lets the settled promise resolve, then flushes the emitting effect. */
  async function wait(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
    TestBed.tick();
  }

  beforeEach(async () => {
    // Only the debounce runs on fake timers — `whenStable` never settles under them.
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [TableSearchInput],
    }).compileComponents();

    fixture = TestBed.createComponent(TableSearchInput);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
    emitted = [];
    fixture.componentInstance.searchTerm.subscribe((term) => emitted.push(term));
  });

  afterEach(() => vi.useRealTimers());

  it('emits only the settled term once typing pauses', async () => {
    type('p');
    type('pr');
    type('pro');
    await wait(299);
    expect(emitted).toEqual([]);

    await wait(1);
    expect(emitted).toEqual(['pro']);
  });

  it('trims the term and skips a repeat of the last one', async () => {
    type('pro');
    await wait(300);
    type(' pro ');
    await wait(300);

    expect(emitted).toEqual(['pro']);
  });

  it('collapses inner whitespace runs, tabs and non-breaking spaces included', async () => {
    type('abc    def');
    await wait(300);
    type('  abc \t def  ');
    await wait(300);
    type('abc  def');
    await wait(300);

    expect(emitted).toEqual(['abc def']);
  });

  it('never emits for whitespace typed into an empty box', async () => {
    type('   ');
    await wait(300);

    expect(emitted).toEqual([]);
  });

  it('emits a cleared box straight away', async () => {
    type('pro');
    await wait(300);
    type('');
    await wait(0);

    expect(emitted).toEqual(['pro', '']);
  });

  it('emits on Enter without waiting, then not again when the timer would have fired', async () => {
    type('pro');
    await pressEnter();
    expect(emitted).toEqual(['pro']);

    await wait(300);
    expect(emitted).toEqual(['pro']);
  });

  it('settles the latest term when Enter lands before the keystroke was processed', async () => {
    type('pr');
    // The last keystroke and Enter in one task: no effect flush between them.
    input.value = 'pro';
    input.dispatchEvent(new Event('input'));
    await pressEnter();

    expect(emitted).toEqual(['pro']);
    await wait(300);
    expect(emitted).toEqual(['pro']);
  });

  it('does nothing on Enter when the term already went out', async () => {
    type('pro');
    await wait(300);
    await pressEnter();
    type('prod');
    await wait(299);

    // A stale "settle next" flag would have emitted 'prod' at once.
    expect(emitted).toEqual(['pro']);
  });

  it('drops a confirmation Enter gave when the box is edited before it was processed', async () => {
    type('a');
    await wait(300);
    // Enter on 'ab', then Backspace back to the sent term, all before an effect flush.
    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    type('a');
    await wait(0);

    type('abc');
    await wait(299);
    // A stale confirmation would have sent 'abc' without the wait.
    expect(emitted).toEqual(['a']);

    await wait(1);
    expect(emitted).toEqual(['a', 'abc']);
  });

  it('clears its pending timer on destroy', () => {
    type('pro');
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('emits on every keystroke without waiting when debounceMs is 0', async () => {
    fixture.componentRef.setInput('debounceMs', 0);
    type('p');
    await wait(0);
    type('pr');
    await wait(0);

    expect(emitted).toEqual(['p', 'pr']);
  });

  it('honours a custom debounce window', async () => {
    fixture.componentRef.setInput('debounceMs', 500);
    type('pro');
    await wait(300);
    expect(emitted).toEqual([]);

    await wait(200);
    expect(emitted).toEqual(['pro']);
  });

  it('fills its container at every breakpoint when fullWidth is set', () => {
    const field = fixture.nativeElement.querySelector('p-iconfield') as HTMLElement;
    expect(field.classList).toContain('lg:w-auto');
    expect(field.classList).toContain('lg:inline-block');
    expect(input.classList).toContain('lg:w-auto');

    fixture.componentRef.setInput('fullWidth', true);
    fixture.detectChanges();

    expect(field.classList).not.toContain('lg:w-auto');
    expect(field.classList).not.toContain('lg:inline-block');
    expect(input.classList).not.toContain('lg:w-auto');
    expect(input.classList).toContain('w-full');
    // The `[class]` binding must not strip the classes Optimus puts on the host.
    expect(input.classList).toContain('p-inputtext');
    expect(field.classList).toContain('p-iconfield');
  });

  it('takes a custom placeholder and accessible name', () => {
    fixture.componentRef.setInput('placeholder', 'Search OKRs');
    fixture.componentRef.setInput('ariaLabel', 'Search objectives');
    fixture.detectChanges();

    expect(input.placeholder).toBe('Search OKRs');
    expect(input.getAttribute('aria-label')).toBe('Search objectives');
  });
});
