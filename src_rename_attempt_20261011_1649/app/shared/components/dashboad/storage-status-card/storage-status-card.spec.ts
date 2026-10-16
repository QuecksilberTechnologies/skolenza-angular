import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StorageStatusCard } from './storage-status-card';

describe('StorageStatusCard', () => {
  let fixture: ComponentFixture<StorageStatusCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StorageStatusCard] }).compileComponents();
    fixture = TestBed.createComponent(StorageStatusCard);
  });

  it('shows usage against capacity and each category', async () => {
    fixture.componentRef.setInput('storage', {
      capacityGigabytes: 50,
      usedGigabytes: 25,
      categories: [{ name: 'Documents', usedGigabytes: 10 }],
    });
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('50%');
    expect(text).toContain('25 GB free');
    expect(text).toContain('Documents');
  });

  it('shows an empty state without storage data', async () => {
    fixture.componentRef.setInput('storage', null);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No storage data');
  });
});
