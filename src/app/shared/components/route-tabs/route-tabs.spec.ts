import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteTab, RouteTabs } from './route-tabs';

@Component({
  imports: [RouteTabs],
  template: `
    <app-route-tabs ariaLabel="Sections" [tabs]="tabs" [selected]="selected()">
      <span toolbar class="projected-toolbar">Filter</span>
      <p class="projected-panel">Rows</p>
    </app-route-tabs>
  `,
})
class Host {
  readonly tabs: RouteTab<string>[] = [
    { id: 'a', label: 'Alpha', route: 'alpha' },
    { id: 'b', label: 'Beta', route: 'beta' },
  ];
  readonly selected = signal('a');
}

describe('RouteTabs', () => {
  const route = {};
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: route }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const tabs = () => [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
    const selected = () =>
      tabs()
        .filter((tab) => tab.getAttribute('aria-selected') === 'true')
        .map((tab) => tab.textContent?.trim());
    const panel = () => root.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])');
    return { fixture, root, tabs, selected, panel };
  }

  it('names the tab list, marks the selected tab and projects toolbar and panel content', async () => {
    const { root, selected, panel } = await render();

    expect(root.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Sections');
    expect(selected()).toEqual(['Alpha']);
    expect(root.querySelector('.projected-toolbar')?.textContent).toBe('Filter');
    expect(panel()?.querySelector('.projected-panel')?.textContent).toBe('Rows');
  });

  it('points every tab at an existing panel, with only the selected one shown', async () => {
    const { root, tabs } = await render();

    for (const tab of tabs()) {
      const target = root.querySelector<HTMLElement>(`#${tab.getAttribute('aria-controls')}`);
      expect(target?.getAttribute('role')).toBe('tabpanel');
      expect(target?.hidden).toBe(tab.getAttribute('aria-selected') !== 'true');
    }
  });

  it('navigates to the clicked tab and keeps the panel visible meanwhile', async () => {
    const { fixture, tabs, selected, panel } = await render();

    tabs()[1].click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['..', 'beta'], { relativeTo: route });
    expect(selected()).toEqual(['Beta']);
    expect(panel()?.hidden).toBe(false);
  });

  it('follows the route once it settles', async () => {
    const { fixture, selected } = await render();

    fixture.componentInstance.selected.set('b');
    await fixture.whenStable();

    expect(selected()).toEqual(['Beta']);
  });

  it('does not navigate when the selected tab is clicked', async () => {
    const { fixture, tabs } = await render();

    tabs()[0].click();
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('restores the selected tab when navigation does not happen', async () => {
    navigate.mockResolvedValue(false);
    const { fixture, tabs, selected, panel } = await render();

    tabs()[1].click();
    await navigate.mock.results[0].value.catch(() => undefined);
    await fixture.whenStable();

    expect(selected()).toEqual(['Alpha']);
    expect(panel()?.hidden).toBe(false);
  });

  it('restores the selected tab when navigation fails', async () => {
    navigate.mockRejectedValue(new Error('blocked'));
    const { fixture, tabs, selected } = await render();

    tabs()[1].click();
    await navigate.mock.results[0].value.catch(() => undefined);
    await fixture.whenStable();

    expect(selected()).toEqual(['Alpha']);
  });
});
