import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { Common } from '@core/services/common';

import ModulePlaceholder, { ModulePlaceholderData } from './module-placeholder';
import { modulePlaceholderRoute } from './module-placeholder-route';

const data: ModulePlaceholderData = {
  pageTitle: 'StaffMember Password Management',
  back: { label: 'Back to StaffMembers', url: '/app/staffMembers' },
};

describe('ModulePlaceholder', () => {
  const setPageHeaderInfo = vi.fn();
  const resetBreadcrumbItems = vi.fn();

  beforeEach(() => {
    setPageHeaderInfo.mockClear();
    resetBreadcrumbItems.mockClear();
  });

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [ModulePlaceholder],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data } } },
        { provide: Common, useValue: { setPageHeaderInfo, resetBreadcrumbItems } },
      ],
    }).compileComponents();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ModulePlaceholder);
    fixture.detectChanges();
    return { fixture, navigate };
  };

  it('names the page in the app header and clears the breadcrumb', async () => {
    await setup();

    expect(setPageHeaderInfo).toHaveBeenCalledWith(
      expect.objectContaining({ pageTitle: data.pageTitle, isBreadcrumbShow: false }),
    );
    expect(resetBreadcrumbItems).toHaveBeenCalled();
  });

  // The header title is not a heading, so this is the only one the page has.
  it('renders the page name as the h1', async () => {
    const { fixture } = await setup();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
      'StaffMember Password Management is coming soon',
    );
  });

  it('leads back to where the route says', async () => {
    const { fixture, navigate } = await setup();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Back to StaffMembers');
    button.click();

    expect(navigate).toHaveBeenCalledWith('/app/staffMembers');
  });
});

describe('modulePlaceholderRoute', () => {
  it('carries the page title and back link in route data and titles the tab', () => {
    const route = modulePlaceholderRoute('password-management', data.pageTitle, data.back);

    expect(route.path).toBe('password-management');
    expect(route.data).toEqual(data);
    expect(route.title).toContain(data.pageTitle);
  });
});
