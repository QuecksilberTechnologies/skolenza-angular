import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TabBar, TabBarItem } from './tab-bar';

@Component({
  imports: [TabBar],
  template: `
    <app-tab-bar
      ariaLabel="Sections"
      [tabs]="tabs"
      [selected]="selected()"
      (tabChange)="picked = $event"
    >
      <span class="projected">Filter</span>
    </app-tab-bar>
  `,
})
class Host {
  readonly tabs: TabBarItem<string>[] = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ];
  readonly selected = signal('a');
  picked?: string;
}

describe('TabBar', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('names the landmark and marks only the selected tab as current', async () => {
    const { root } = await render();
    const buttons = [...root.querySelectorAll('nav button')];

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Sections');
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Alpha', 'Beta']);
    expect(buttons.map((b) => b.getAttribute('aria-current'))).toEqual(['page', null]);
  });

  it('emits the clicked tab id and projects toolbar content', async () => {
    const { fixture, root } = await render();

    root.querySelectorAll<HTMLButtonElement>('nav button')[1].click();

    expect(fixture.componentInstance.picked).toBe('b');
    expect(root.querySelector('.projected')?.textContent).toBe('Filter');
  });
});
