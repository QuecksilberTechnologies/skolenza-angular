import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProfileList } from '../profile-list/profile-list';
import { ProfileListItem } from './profile-list-item';

@Component({
  imports: [ProfileList, ProfileListItem],
  template: `
    <app-profile-list>
      <app-profile-list-item title="PAN Card">
        <span badges>Not added</span>
        <span meta>Government Issued Identity</span>
        <span meta>India</span>
        <button actions>Edit</button>
      </app-profile-list-item>
    </app-profile-list>
  `,
})
class TestHost {}

describe('ProfileListItem', () => {
  it('renders a list row with its title and projected slots', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('app-profile-list')?.getAttribute('role')).toBe('list');
    const row = el.querySelector('app-profile-list-item');
    expect(row?.getAttribute('role')).toBe('listitem');
    expect(row?.querySelector('p')?.textContent?.trim()).toBe('PAN Card');
    expect(row?.querySelectorAll('[meta]').length).toBe(2);
    // Actions sit last so they align to the right of the row.
    expect(row?.lastElementChild?.textContent).toBe('Edit');
  });
});
