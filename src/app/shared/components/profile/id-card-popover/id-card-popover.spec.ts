import { OverlayModule } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Common, StaffMemberBasicAPI, InstitutionsApi } from '@core/services';
import { IProfileSummary } from '@shared/interfaces';

import { IdCardPopover } from './id-card-popover';

const summary = {
  staffMemberId: 'emp-1',
  fullName: 'Sujeet Kumar Jaiswara',
  staffPositionMasterId: 1,
  positionName: 'Senior Software Engineer',
  department: 2,
  departmentType: 'Engineering',
  staffMemberCode: 'SJ/2026/MAR/0001',
  mobileNumber: '+91 74154 72563',
  offilcialEmail: 'sujeet@technova.test',
} as IProfileSummary;

const loginInfo = {
  user: { staffMemberId: 'emp-1', institutionName: 'TechNova Solutions Pvt. Ltd.' },
};

@Component({
  template: `
    <button cdkOverlayOrigin #origin="cdkOverlayOrigin" type="button">Trigger</button>
    <app-id-card-popover
      [origin]="origin"
      [(open)]="open"
      (closed)="closedCount = closedCount + 1"
    />
  `,
  imports: [OverlayModule, IdCardPopover],
})
class Host {
  readonly popover = viewChild.required(IdCardPopover);
  open = signal(false);
  closedCount = 0;
}

describe('IdCardPopover', () => {
  let fixture: ComponentFixture<Host>;

  const card = () => document.querySelector('.cdk-overlay-container app-popup');

  const openWithData = async () => {
    await fixture.componentInstance.popover().loadData(summary);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideHttpClient(),
        { provide: Common, useValue: { getLoginInfo: () => Promise.resolve(loginInfo) } },
        { provide: StaffMemberBasicAPI, useValue: { profileImage: () => null } },
        {
          provide: InstitutionsApi,
          useValue: {
            brandLogos: () => ({
              darkSmall: null,
              darkLarge: null,
              lightSmall: null,
              lightLarge: null,
              favicon: null,
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders nothing while closed', () => {
    expect(card()).toBeNull();
  });

  it('shows the staffMember details once opened', async () => {
    await openWithData();

    expect(card()).not.toBeNull();
    expect(card()!.textContent).toContain('Sujeet Kumar Jaiswara');
    expect(card()!.textContent).toContain('SJ/2026/MAR/0001');
  });

  it('closes on Escape and notifies the host', async () => {
    await openWithData();

    document
      .querySelector('.cdk-overlay-container')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(card()).toBeNull();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('closes when the page scrolls', async () => {
    await openWithData();

    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(card()).toBeNull();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('stays open when the scroll comes from inside the card', async () => {
    await openWithData();

    const pane = document.querySelector('.cdk-overlay-pane')!;
    pane.dispatchEvent(new Event('scroll', { bubbles: true }));
    fixture.detectChanges();

    expect(card()).not.toBeNull();
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('omits vCard lines that have no value', async () => {
    await fixture.componentInstance.popover().loadData({ ...summary, mobileNumber: '' });

    const vCard = fixture.componentInstance.popover().vCard();
    expect(vCard).toContain('FN:Sujeet Kumar Jaiswara');
    expect(vCard).toContain('ORG:TechNova Solutions Pvt. Ltd.');
    expect(vCard).not.toContain('TEL:');
  });
});
