import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common, LocationsApi, CampusApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { CampusRow } from '@shared/interfaces';

import { CampusDetail } from './campus-detail';

/** Trimmed from a live `get-all` row: `stateName` comes back null although `stateId` is set. */
const row: CampusRow = {
  id: 8,
  locationCode: 'JBP_CLIENT_SITE',
  locationName: 'Samdariya Mall',
  countryId: 1,
  countryName: 'India',
  stateId: 20,
  stateName: null,
  isActive: true,
};

const locationsApiMock = { getStates: vi.fn() };
const campusApiMock = { getCampus: vi.fn() };
const commonMock = { showMessage: vi.fn() };
const lookupStoreMock = { globalOptionsStaffMemberId: () => 'EMP001' };

/** `get-by-id` answers with `fresh` — the row itself unless a test says otherwise. */
async function render(location: CampusRow, fresh: CampusRow | null = location) {
  if (!campusApiMock.getCampus.getMockImplementation()) {
    campusApiMock.getCampus.mockReturnValue(
      of({ isSucceeded: true, message: '', data: fresh }),
    );
  }
  const fixture = TestBed.createComponent(CampusDetail);
  fixture.componentRef.setInput('location', location);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

function valueOf(fixture: Awaited<ReturnType<typeof render>>, label: string) {
  return fixture.componentInstance['sections']()
    .flatMap((section) => section.items)
    .find((item) => item.label === label)?.value;
}

describe('CampusDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    locationsApiMock.getStates.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: 20, countryId: 1, stateName: 'Madhya Pradesh', isActive: true }],
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: LocationsApi, useValue: locationsApiMock },
        { provide: CampusApi, useValue: campusApiMock },
        { provide: Common, useValue: commonMock },
        { provide: LookupStore, useValue: lookupStoreMock },
      ],
    });
  });

  it('resolves a missing state name from the states lookup', async () => {
    const fixture = await render(row);

    expect(locationsApiMock.getStates).toHaveBeenCalledWith(
      expect.objectContaining({ CountryId: 1, UserStaffMemberId: 'EMP001' }),
    );
    expect(valueOf(fixture, 'State')).toBe('Madhya Pradesh');
  });

  it('skips the lookup when the row already carries the state name', async () => {
    const fixture = await render({ ...row, stateName: 'Madhya Pradesh' });

    expect(locationsApiMock.getStates).not.toHaveBeenCalled();
    expect(valueOf(fixture, 'State')).toBe('Madhya Pradesh');
  });

  it('skips the lookup when the row has no state', async () => {
    const fixture = await render({ ...row, stateId: null });

    expect(locationsApiMock.getStates).not.toHaveBeenCalled();
    expect(valueOf(fixture, 'State')).toBe('—');
  });

  it('reads a flag the row did not carry as unknown rather than "No"', async () => {
    const fixture = await render({ ...row, isHeadOffice: false });

    expect(valueOf(fixture, 'Head Office')).toBe('No');
    expect(valueOf(fixture, 'Biometric Enabled')).toBe('—');
  });

  it('reads the record through get-by-id and prefers it over the list row', async () => {
    const fixture = await render(row, { ...row, landmark: 'Near Gate 2' });

    expect(campusApiMock.getCampus).toHaveBeenCalledWith(8, null);
    expect(valueOf(fixture, 'Landmark')).toBe('Near Gate 2');
  });

  it('passes the host institution filter through to get-by-id', async () => {
    campusApiMock.getCampus.mockReturnValue(
      of({ isSucceeded: true, message: '', data: row }),
    );
    const fixture = TestBed.createComponent(CampusDetail);
    fixture.componentRef.setInput('location', row);
    fixture.componentRef.setInput('institutionId', 'TEN00005');
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(campusApiMock.getCampus).toHaveBeenCalledWith(8, 'TEN00005');
  });

  it('shows the loading state until get-by-id answers', async () => {
    const pending = new Subject<never>();
    campusApiMock.getCampus.mockReturnValue(pending);
    const fixture = TestBed.createComponent(CampusDetail);
    fixture.componentRef.setInput('location', row);
    fixture.detectChanges();

    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(status?.textContent).toContain('Loading location details');
    expect(locationsApiMock.getStates).not.toHaveBeenCalled();
  });

  it('falls back to the list row and reports the error when get-by-id fails', async () => {
    campusApiMock.getCampus.mockReturnValue(
      throwError(() => new Error('Network down')),
    );
    const fixture = await render(row);

    expect(commonMock.showMessage).toHaveBeenCalledWith('Network down', 'error');
    expect(valueOf(fixture, 'Location Code')).toBe('JBP_CLIENT_SITE');
  });
});
